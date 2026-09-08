import * as T from '../vendor/three.module.js';
import {KAIJU_CENTER,kaijuRingRadius,kaijuWalkFloors} from './city-layout.js';
import {getLightingPreset} from './lighting.js';

/** Fixed light pool for the two currently important cities. No shadow maps. */
export class CityLighting {
  constructor(scene){
    this.scene=scene;
    this.geometries=[new T.CylinderGeometry(.038,.056,1.25,8),new T.BoxGeometry(.18,.22,.18),new T.ConeGeometry(.19,.18,8),new T.CylinderGeometry(.23,.28,.36,12),new T.CircleGeometry(.19,12)];
    this.metal=new T.MeshStandardMaterial({color:0x655746,roughness:.58,metalness:.62});
    this.glow=new T.MeshStandardMaterial({color:0xefb66b,emissive:0xffb868,emissiveIntensity:.1,roughness:.3});
    for(const geometry of this.geometries)geometry.userData.shared=true;
    this.metal.userData.shared=this.glow.userData.shared=true;
    this.slots=[];this.up=new T.Vector3(0,0,1);this.direction=new T.Vector3();
    for(let i=0;i<2;i++){
      const rig=new T.Group();rig.name='Local city lamps';rig.userData.noBatch=true;
      const lamps=[],points=[];
      for(let j=0;j<2;j++){
        const lamp=new T.Group();lamp.name=j?'Promenade lantern':'Keep forecourt lantern';rig.add(lamp);
        const post=new T.Mesh(this.geometries[0],this.metal);post.position.y=.66;lamp.add(post);
        const bulb=new T.Mesh(this.geometries[1],this.glow);bulb.position.y=1.4;lamp.add(bulb);
        const cap=new T.Mesh(this.geometries[2],this.metal);cap.position.y=1.61;lamp.add(cap);
        const marker=new T.Object3D();marker.position.y=1.4;lamp.add(marker);
        const light=new T.PointLight(0xffbd78,0,6.5,2);light.castShadow=false;scene.add(light);points.push(light);lamps.push({group:lamp,marker,post,bulb,cap});
      }
      const search=new T.Group();search.name='Backpack shoulder lantern';rig.add(search);
      const housing=new T.Mesh(this.geometries[3],this.metal);housing.rotation.x=Math.PI/2;search.add(housing);
      const lens=new T.Mesh(this.geometries[4],this.glow);lens.position.z=.185;search.add(lens);
      const marker=new T.Object3D();marker.position.z=.205;search.add(marker);
      const targetMarker=new T.Object3D();rig.add(targetMarker);
      const spot=new T.SpotLight(0xffc68d,0,18,.95,.90,2);spot.castShadow=false;scene.add(spot,spot.target);
      this.slots.push({city:null,rig,lamps,points,search,marker,targetMarker,spot,rings:-1});
    }
  }

  assign(slot,city){
    const floor=city?.layout==='tower'?(city.inspectedFloor??-1):-1;
    const verticalSignature=city?.verticalLayout?.signature??null;
    if(slot.city===city&&slot.rings===(city?.rings??-1)&&slot.floor===floor&&slot.verticalSignature===verticalSignature)return;
    slot.city=city;slot.rings=city?.rings??-1;slot.floor=floor;slot.verticalSignature=verticalSignature;slot.rig.removeFromParent();
    if(!city)return;
    city.rig.add(slot.rig);slot.rig.position.set(0,city.deckY,0);
    const circular=city.faction==='kaiju',tower=city.layout==='tower',keep=city.slotPositions[7],angle=keep.rotation??0;
    // Beside the immutable keep, outside its footprint and on the public path.
    slot.lamps[0].group.position.set(keep.x+Math.cos(angle)*1.49+Math.sin(angle)*1.68,keep.y??0,keep.z-Math.sin(angle)*1.49+Math.cos(angle)*1.68);
    if(tower){
      const floors=city.verticalLayout?city.verticalLayout.floors.filter(f=>!f.underConstruction):kaijuWalkFloors(city.rings??1);
      const active=(floor<0?floors.at(-1):floors.filter(f=>f.tier<=floor).at(-1))??floors[0];
      // A pending storey has no occupied promenade or lamps yet.
      slot.rig.visible=!!active;
      if(!active)return;
      if(city.verticalLayout){
        const lowest=floors[0],a=lowest.path[0],b=lowest.path[1],c=active.path[1],d=active.path[2];
        slot.lamps[0].group.position.set(a.x+(b.x-a.x)*.16,lowest.y+lowest.surfaceOffset,a.z+(b.z-a.z)*.16);
        slot.lamps[1].group.position.set(c.x+(d.x-c.x)*.32,active.y+active.surfaceOffset,c.z+(d.z-c.z)*.32);
        slot.lamps[0].group.userData.towerTier=lowest.tier;
      }else{
        slot.lamps[0].group.position.y+=active.surfaceOffset;
        slot.lamps[1].group.position.set(4.62,active.y+active.surfaceOffset,KAIJU_CENTER.z-4);
      }
      slot.lamps[1].group.userData.towerTier=active.tier;
      // The search lantern is fixed to the body-facing masonry, above the
      // lower floor and outside the supported pedestrian promenade.
      slot.search.position.set(0,3.5,city.verticalLayout?KAIJU_CENTER.z+4.02:-5.49);slot.targetMarker.position.set(0,42.5-city.deckY,-2.75);
      this.direction.copy(slot.targetMarker.position).sub(slot.search.position).normalize();slot.search.quaternion.setFromUnitVectors(this.up,this.direction);
    }else if(circular){
      const radius=kaijuRingRadius(city.rings??1),sectors=(city.rings??1)>1?13:6,a=Math.PI+Math.PI/sectors;
      slot.lamps[1].group.position.set(Math.sin(a)*(radius-.37),0,KAIJU_CENTER.z+Math.cos(a)*(radius-.37));
      // Small fixture stands on the parapet, outside every build plot. Its
      // upward cone reaches the rear shoulders, never the ground below.
      slot.search.position.set(0,1.08,KAIJU_CENTER.z+radius-.08);
      slot.targetMarker.position.set(0,42.5-city.deckY,-2.75);
      this.direction.copy(slot.targetMarker.position).sub(slot.search.position).normalize();slot.search.quaternion.setFromUnitVectors(this.up,this.direction);
    }else slot.lamps[1].group.position.set(7.62,0,3.7);
    if(!tower)slot.rig.visible=true;
    // Rectangular decks already have a lantern at this exact promenade point.
    for(const part of ['post','bulb','cap'])slot.lamps[1][part].visible=circular;
    slot.search.visible=circular;slot.rig.updateWorldMatrix(true,true);
  }

  update(player,activeEnemy,preset){
    const p=typeof preset==='string'||!preset?getLightingPreset(preset):preset;
    const local=p.localLight??Math.max(0,p.windows-.12)*5.5,uplight=p.uplight??Math.max(0,p.windows-.12)*35;
    this.glow.emissiveIntensity=.1+p.windows*1.65;
    for(let i=0;i<2;i++){
      const slot=this.slots[i],city=i?activeEnemy:player;this.assign(slot,city??null);
      if(!city||!slot.rig.visible){for(const light of slot.points)light.intensity=0;slot.spot.intensity=0;continue;}
      const scale=city.scale??1;
      for(let j=0;j<2;j++){
        const light=slot.points[j];slot.lamps[j].marker.getWorldPosition(light.position);
        light.intensity=local*scale*scale*(j?.8:1);light.distance=6.5*scale;
      }
      slot.marker.getWorldPosition(slot.spot.position);slot.targetMarker.getWorldPosition(slot.spot.target.position);
      slot.spot.intensity=city.faction==='kaiju'?uplight:0;
    }
  }

  reset(){for(const slot of this.slots){slot.rig.removeFromParent();slot.city=null;slot.rings=-1;slot.floor=-1;for(const light of slot.points)light.intensity=0;slot.spot.intensity=0;}}
  dispose(){this.reset();for(const slot of this.slots){for(const light of slot.points){light.removeFromParent();light.dispose();}slot.spot.removeFromParent();slot.spot.target.removeFromParent();slot.spot.dispose();}for(const geometry of this.geometries)geometry.dispose();this.metal.dispose();this.glow.dispose();}
}
