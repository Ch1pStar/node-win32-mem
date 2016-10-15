const wp = require('./build/Release/wp');
const pb = require('./protobuf/entity_pb');
const ws = require('ws');

toHex = (v)=>{
  return `0x${v.toString(16)}`;
}

const TEAMS = ["", "Spectator", "T", "CT"],
      SIGNED_INT = 0,
      UNSIGNED_INT = 1,
      FLOAT_T = 2,
      VEC3 = 3;
      STR = 4;

const clients = [];
let activeClient;

class Entity{
  constructor(baseAddress, id){
    this.id = id;
    
    this.baseAddress = wp.readMemoryValue(pHandle, mBaseAddr+baseAddress, UNSIGNED_INT);

    this.crosshairIdOffset = 0xAA64;
    this.crosshairId;

    this.healthOffset = 0xFC;
    this.health;

    this.armorOffset = 0xA9F8;
    this.armor;

    this.rankOffset = 0x1A44;
    this.rank;

    this.teamOffset = 0xF0;
    this.team;

    this.originOffset = 0x134;
    this.origin;

    this.velocityOffset = 0x110;
    this.velocity;

    // console.log(`Entity base address ${toHex(baseAddress)}`);
  }


  get health(){
    return this.readValue(this.healthOffset);
  }

  get armor(){
    return this.readValue(this.armorOffset);
  }

  get rank(){
    return this.readValue(this.rankOffset);
  }

  get velocity(){
    return this.readValue(this.velocityOffset, FLOAT_T);
  }

  get origin(){
    return this.readValue(this.originOffset, VEC3);
  }

  get team(){
    // return TEAMS[this.readValue(this.teamOffset)];
    return this.readValue(this.teamOffset);
  }

  get crosshairId(){
    return this.readValue(this.crosshairIdOffset);
  }

  readValue(offset, signed = UNSIGNED_INT){
    return wp.readMemoryValue(pHandle, this.baseAddress + offset, signed);
  }

}

const pName = process.argv[2] || 'csgo.exe',
  moduleName = process.argv[3] || 'client.dll',
  pid = wp.getPIDByName(pName),
  modules = wp.getProcessModules(pid),
  mBaseAddr = modules.get(moduleName),
  pHandle = wp.openProcess(pid),
  dwLocalPlayer = 0xA8A53C,
  dwViewMatrix = 0x4A9D564;

const localPlayer = new Entity(dwLocalPlayer, 1);
console.log(localPlayer.id, localPlayer.health, localPlayer.team);

// console.log(localPlayer.health);

const dwEntityList = 0x4AAB9C4;
// setInterval(()=>{

// }, 100);


const server = new ws.Server({port:1337});
server.on('connection', client=>{
  activeClient = client;
  clients.push(client);
  console.log(`${client} connected`);
  // client.on('message', msg=>{

  // });
});


const getState = ()=>{
  const ret = new Array(10);
  for(let i = 0; i < 10;i++){
    const player = new Entity(dwEntityList+(i*0x10),i+1);
    // console.log(player.id, player.health, player.team, player.origin);
    const netEntity = new pb.Entity();
    netEntity.setId(player.id);
    netEntity.setHealth(player.health);
    netEntity.setArmor(player.armor);
    netEntity.setTeam(player.team);
    let pos = new pb.Entity.Position();
    pos.setX(player.origin.get('x'));
    pos.setY(player.origin.get('y'));
    pos.setZ(player.origin.get('z'));
    netEntity.setPos(pos);


    ret[i] = new Buffer(netEntity.serializeBinary());
  }

  return ret;
};

const sendState = client =>{
  const state = getState();
  client.send(state[0]);
};


sendState(activeClient)

process.on('SIGINT', ()=>{
  if(pHandle){
    wp.closeProcess(pHandle);    
  }
  process.exit();
});
