#include <node.h>
#include <windows.h>
#include <TlHelp32.h>

#include <stdio.h>
#include <string.h>

using namespace v8;
using namespace node;
using namespace std;


enum read_t{
  SIGNED_INT,
  UNSIGNED_INT,
  FLOAT_T,
  VEC3,
  STR
};

template<class T> T _read_memory_value(HANDLE handle, LPVOID address){
  T v_read;
  ReadProcessMemory(handle, address, &v_read, sizeof(v_read), NULL);
  return v_read;
}

void read_memory_value(const FunctionCallbackInfo<Value>& args){
  Isolate* isolate = args.GetIsolate();
  uint32_t h_process =  args[0]->ToUint32()->Value();
  uint32_t addr = args[1]->ToUint32()->Value();
  uint32_t type = args[2]->ToUint32()->Value();

  switch(type){
    case SIGNED_INT:
      args.GetReturnValue().Set(_read_memory_value<int>((HANDLE)h_process, (LPVOID)addr));
      break;
    case UNSIGNED_INT:
      args.GetReturnValue().Set(_read_memory_value<uint32_t>((HANDLE)h_process, (LPVOID)addr));
      break;
    case FLOAT_T:
      args.GetReturnValue().Set(_read_memory_value<float>((HANDLE)h_process, (LPVOID)addr));
      break;
    case STR:{
        // char* lol = _read_memory_value<type24>((HANDLE)h_process, (LPVOID)addr);
        // Local<String> ret_str = String::NewFromUtf8(isolate, lol);
        // args.GetReturnValue().Set(String::NewFromUtf8(isolate, lol));
    }break;
    case VEC3:{
      typedef struct{
        float x;
        float y;
        float z;
      }vec3;

      vec3 vec = _read_memory_value<vec3>((HANDLE)h_process, (LPVOID)addr);
      Local<Map> ret = Map::New(isolate);

      ret->Set(isolate->GetCurrentContext(), 
      String::NewFromUtf8(isolate, "x"), 
      Number::New(isolate, vec.x));

      ret->Set(isolate->GetCurrentContext(), 
      String::NewFromUtf8(isolate, "y"), 
      Number::New(isolate, vec.y));

      ret->Set(isolate->GetCurrentContext(), 
      String::NewFromUtf8(isolate, "z"), 
      Number::New(isolate, vec.z));

      args.GetReturnValue().Set(ret);
    }break;
  }
  
}

void open_process(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  uint32_t pid = args[0]->ToUint32()->Value();
  args.GetReturnValue().Set((double)(uint64_t)OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid));
}

void close_process(const FunctionCallbackInfo<Value>& args){
  Isolate* isolate = args.GetIsolate();
  uint64_t handle = args[0]->ToUint32()->Value();
  args.GetReturnValue().Set((bool)CloseHandle((HANDLE)handle));
}

void get_processid_by_name(const FunctionCallbackInfo<Value>& args){
  Isolate* isolate = args.GetIsolate();
  if(!args[0]->IsString()){
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "process name must be a string")));
    return;
  }
  HANDLE h_pid = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  PROCESSENTRY32 p_entry;
  p_entry.dwSize = sizeof(PROCESSENTRY32);
  String::Utf8Value p_name(args[0]->ToString());
  
  while(Process32Next(h_pid, &p_entry)){
   if(!strcmp(*p_name, p_entry.szExeFile)) 
    break;
  }
  CloseHandle(h_pid);

  args.GetReturnValue().Set((uint32_t)p_entry.th32ProcessID);
}

void get_process_modules(const FunctionCallbackInfo<Value>& args){
  Isolate* isolate = args.GetIsolate();

  if(!args[0]->IsUint32()){
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate, "process id must be an unsigned integer(uint32_t)")));
    return;
  }
  Local<Map> ret = Map::New(isolate);
  uint32_t pid = args[0]->ToUint32()->Value();

  HANDLE h_module = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, (DWORD)pid);
  MODULEENTRY32 m_entry;
  m_entry.dwSize = sizeof(MODULEENTRY32);

  int i=0;
  if(!Module32First(h_module, &m_entry)){
    isolate->ThrowException(Exception::TypeError(
      String::NewFromUtf8(isolate, "failed to read modules for pid")));
    return;
  }else{
    do{
      ret->Set(isolate->GetCurrentContext(), 
        String::NewFromUtf8(isolate, m_entry.szModule), 
        Number::New(isolate, (uint64_t)m_entry.modBaseAddr));
    }while(Module32Next(h_module, &m_entry));
  }

  args.GetReturnValue().Set(ret);
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "closeProcess", close_process);
  NODE_SET_METHOD(exports, "openProcess", open_process);
  NODE_SET_METHOD(exports, "getPIDByName", get_processid_by_name);
  NODE_SET_METHOD(exports, "getProcessModules", get_process_modules);
  NODE_SET_METHOD(exports, "readMemoryValue", read_memory_value);
}

NODE_MODULE(wp, init)

