const pb = require('../protobuf/entity_pb');
const PIXI = require('pixi.js');

const init = ()=>{
  const screenWidth = 900;
  const screenHeight = 450;

  const mapX0 = -2100;
  const mapX1 = 1800;
  const mapY0 = -1000;
  const mapY1 = 3100;

  const mapWidth = mapX1 - mapX0;
  const mapHeight = mapY1 - mapY0;


  console.log(PIXI);
  const renderer = PIXI.autoDetectRenderer(screenWidth, screenHeight,{backgroundColor : 0xFFFFFF});
  document.body.appendChild(renderer.view);
  const stage = new PIXI.Container();

  const ctTexture = PIXI.Texture.fromImage('img/ct.png');
  const tTexture = PIXI.Texture.fromImage('img/t.png');
  const entities = new Array(10);

  for(let i = 0;i<10;i++){
    let texture;
    if(i == 0){
      texture = ctTexture;
    }else{
      texture = tTexture;
    }
    let icon = new PIXI.Sprite();

    icon.anchor.x = 0.5;
    icon.anchor.y = 0.5;
    icon.width = 15;
    icon.height = 15;
    entities[i] = icon;
    stage.addChild(icon);
  }

  const render = t =>{
    requestAnimationFrame(render);
    renderer.render(stage);
  }

  const initClient = ()=>{
    const ws = new WebSocket('ws://localhost:1337');
    ws.binaryType = 'arraybuffer';
    ws.onopen = e =>{
      console.log("Connected to server");
    }

    ws.onmessage = e=>{
      const state = pb.State.deserializeBinary(e.data).toObject();
      const netEntities = state.entitiesList;

      for(let i = 0;i<netEntities.length;i++){
        let netEntity = netEntities[i];
        let localEntity = entities[i];

        if(!localEntity.texture.imageUrl){
          localEntity.texture = (netEntity.team-1)==1?tTexture:ctTexture;
        }

        if(netEntity.health>0){
          let x = ((netEntity.pos.x - mapX0) / mapWidth) * screenWidth;
          let y = ((netEntity.pos.y - mapY0) / mapHeight) * (screenHeight);
        
          localEntity.position.x = x;
          localEntity.position.y = y;
          if(!localEntity.visible)localEntity.visible = true;
        }else{
          localEntity.visible = false;
        }        
      }

    }
  }

  initClient();

  render();
}

document.addEventListener("DOMContentLoaded", e=> {
  console.log("DOM loaded...");
  init();
});