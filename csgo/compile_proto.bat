set cdir=./protobuf
cd %cdir%
rm ./entity_pb.js
protoc --js_out="import_style=commonjs,binary:". ./entity.proto