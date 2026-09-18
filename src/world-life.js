import * as T from '../vendor/three.module.js';
import { getMaterial } from './materials.js';
import { terrainHeight, shoreDistance } from './terrain.js';
import { windAt } from './weather.js';

const TAU = Math.PI * 2;
const temp = new T.Object3D();
function random(seed) { let n = seed >>> 0; return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296); }
function instances(group, geometry, material, count, name) {
  const mesh = new T.InstancedMesh(geometry, material, count); mesh.name = name;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
  mesh.castShadow = mesh.receiveShadow = true; mesh.userData.noBatch = true; group.add(mesh); return mesh;
}
function transform(mesh, index, x, y, z, sx, sy, sz, yaw = 0, roll = 0, pitch = 0) {
  temp.position.set(x, y, z); temp.rotation.set(pitch, yaw, roll, 'YXZ'); temp.scale.set(sx, sy, sz); temp.updateMatrix(); mesh.setMatrixAt(index, temp.matrix);
}
function wingGeometry() {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([0,0,.3, 1.35,0,.07, 1.72,0,-.40, .36,0,-.29], 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute([0,0, 1,0, 1,1, 0,1], 2));
  geometry.setIndex([0,1,2,0,2,3]); geometry.computeVertexNormals(); return geometry;
}
function butterflyGeometry(){
  const g=new T.BufferGeometry(),outline=[[0,-.10],[.08,-.31],[.28,-.35],[.36,-.19],[.28,-.01],[.37,.12],[.33,.30],[.17,.38],[.05,.21]],p=[.05,0,0],uv=[.15,.5],indices=[];
  for(const[x,y]of outline){p.push(x,y,Math.sin(x*8)*.035);uv.push(x/.4,(y+.4)/.8);}
  for(let i=0;i<outline.length;i++)indices.push(0,i+1,(i+1)%outline.length+1);
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Small ambient creatures use a handful of instanced draws and never obstruct travel. */
export function createWorldLife() {
  const group = new T.Group(); group.name = 'Living valley wildlife'; group.userData.noBatch = true;
  const rand = random(97536), birdCount = 18, butterflyCount = 24, herdCount = 15;
  const birdBody = instances(group, new T.SphereGeometry(1, 10, 7), getMaterial('fabric', 0xd4d6c7), birdCount, 'Circling river birds');
  const birdWings = instances(group, wingGeometry(), getMaterial('fabric', 0xc0c7bd, { side: T.DoubleSide }), birdCount * 2, 'Beating wings');
  const butterflyWings = instances(group, butterflyGeometry(), getMaterial('fabric', 0xffffff, { side: T.DoubleSide }), butterflyCount * 2, 'Scalloped meadow butterfly wings');
  const sphere = new T.SphereGeometry(1, 10, 7), bodyMat = getMaterial('fabric', 0xffffff);
  const deerBody = instances(group, sphere, bodyMat, herdCount, 'Grazing valley deer');
  const deerHead = instances(group, sphere, getMaterial('fabric', 0xac926d), herdCount, 'Deer heads');
  const deerNeck = instances(group, sphere, getMaterial('fabric', 0xb09a72), herdCount, 'Deer necks');
  const deerLegs = instances(group, new T.CylinderGeometry(.7, 1, 1, 6), getMaterial('fabric', 0x635e49), herdCount * 4, 'Walking deer legs');
  const deerEars = instances(group, sphere, getMaterial('fabric', 0xbcaa87), herdCount * 2, 'Deer ears');
  const deerTails = instances(group, sphere, getMaterial('fabric', 0xe0d7bb), herdCount, 'Deer tails');
  const deerMuzzles=instances(group,sphere,getMaterial('fabric',0x75634b),herdCount,'Deer muzzles');
  const deerEyes=instances(group,sphere,getMaterial('metal',0x171a12,{roughness:.24}),herdCount*2,'Alert deer eyes');
  const birdHeads=instances(group,sphere,getMaterial('fabric',0xe4e2cd),birdCount,'River bird heads');
  const birdBeaks=instances(group,new T.ConeGeometry(1,1,7).rotateX(Math.PI/2),getMaterial('horn',0xa89871),birdCount,'River bird beaks');
  const birds = Array.from({length: birdCount}, (_, i) => ({
    x: [-45, 70, -116][i % 3], z: [10, -75, 110][i % 3], phase: rand() * TAU,
    radius: 18 + rand() * 28, height: 25 + rand() * 33, speed: .075 + rand() * .055, size: .65 + rand() * .4
  }));
  const birdGround=new Map();
  for(const bird of birds){const key=bird.x+','+bird.z;if(!birdGround.has(key))birdGround.set(key,terrainHeight(bird.x,bird.z));bird.homeGround=birdGround.get(key);}
  const butterflies = Array.from({length: butterflyCount}, (_, i) => ({
    x: [-42, 58, -120, 73][i % 4] + (rand() - .5) * 21,
    z: [1, 65, -104, 106][i % 4] + (rand() - .5) * 21, phase: rand() * TAU
  }));
  const deer = Array.from({length: herdCount}, (_, i) => {
    const homeX = [-92, 91, -144][i % 3] + (rand() - .5) * 14, homeZ = [29, 112, -46][i % 3] + (rand() - .5) * 14;
    return { homeX, homeZ, x: homeX, z: homeZ, angle: rand() * TAU, phase: rand() * TAU, scale: .68 + rand() * .32, flee: 0 };
  });
  deer.forEach((animal, i) => deerBody.setColorAt(i, new T.Color(i % 4 ? 0xb4a07b : 0x8e846c)));
  butterflies.forEach((butterfly, i) => {
    const colour = new T.Color([0xdab779, 0xe0d7a9, 0xabbdcd, 0xc2a6bb][i % 4]);
    butterflyWings.setColorAt(i * 2, colour); butterflyWings.setColorAt(i * 2 + 1, colour);
  });
  const meshes = [birdBody, birdWings, birdHeads,birdBeaks,butterflyWings, deerBody, deerHead, deerNeck, deerLegs, deerEars, deerTails,deerMuzzles,deerEyes];
  const windSample = {};
  let previousTime=NaN;
  const previousActors=[];
  const stats = { lifeCount: birdCount + butterflyCount + herdCount, birdCount, butterflyCount, herdCount, glidingBirds: 0 };
  return {
    group, stats,
    update(time, delta = 0, actors = []) {
      const dt = Math.min(.1, Math.max(0, delta));
      // Paused frames keep the existing pose and GPU buffers. An actor change
      // still refreshes reactions, even at a frozen animation time.
      const sameActors=actors.length===previousActors.length&&actors.every((actor,i)=>{
        const prior=previousActors[i];return actor.faction===prior.faction&&actor.moving===prior.moving&&actor.x===prior.x&&actor.z===prior.z&&actor.scale===prior.scale;
      });
      if(dt===0&&time===previousTime&&sameActors)return;
      if(!sameActors){
        previousActors.length=actors.length;
        actors.forEach((actor,i)=>{const prior=previousActors[i]??(previousActors[i]={});prior.faction=actor.faction;prior.moving=actor.moving;prior.x=actor.x;prior.z=actor.z;prior.scale=actor.scale;});
      }
      previousTime=time;
      stats.glidingBirds = 0;
      birds.forEach((bird, i) => {
        const wind = windAt(time, bird.x, bird.z, windSample), drift = Math.sin(time * .075 + bird.phase) * 4;
        const a = time * bird.speed + bird.phase, x = bird.x + Math.cos(a) * bird.radius + wind.x * drift, z = bird.z + Math.sin(a) * bird.radius * .67 + wind.z * drift;
        const y = Math.max(terrainHeight(x, z) + 14, bird.homeGround + bird.height + Math.sin(a * 2) * 2.5 + wind.gust * 1.4);
        const yaw = Math.atan2(-Math.sin(a), Math.cos(a) * .67), size = bird.size, bank = -.11 - wind.gust * .11 + Math.sin(a * .8) * .05;
        const gliding = Math.sin(time * .32 + bird.phase) + wind.gust * .35 > -.12;
        if (gliding) stats.glidingBirds++;
        transform(birdBody, i, x, y, z, .22 * size, .19 * size, .63 * size, yaw, bank, -.035);
        transform(birdHeads,i,x+Math.sin(yaw)*.54*size,y+.12*size,z+Math.cos(yaw)*.54*size,.18*size,.17*size,.23*size,yaw,bank);
        transform(birdBeaks,i,x+Math.sin(yaw)*.83*size,y+.095*size,z+Math.cos(yaw)*.83*size,.065*size,.065*size,.32*size,yaw,bank);
        const flap = Math.sin(time * (3.8 + i % 3 * .45) + bird.phase) * (gliding ? .045 : .48);
        for (const side of [-1, 1]) transform(birdWings, i * 2 + (side > 0 ? 1 : 0), x, y, z, size, size, size, yaw, bank + side * flap + (side < 0 ? Math.PI : 0), -.035);
      });
      butterflies.forEach((butterfly, i) => {
        const wind = windAt(time, butterfly.x, butterfly.z, windSample), a = time * .58 + butterfly.phase;
        const settle = Math.max(0, (Math.sin(time * .21 + butterfly.phase) - .65) / .35);
        const x = butterfly.x + Math.sin(a) * 2.6 + wind.x * wind.gust * 1.6, z = butterfly.z + Math.cos(a * .83) * 2.4 + wind.z * wind.gust * 1.6;
        const y = terrainHeight(x, z) + .45 + (1 - settle) * (.8 + Math.sin(a * 1.7) * .40), flap = .5 + Math.sin(time * (13 - settle * 7) + butterfly.phase) * (.67 - settle * .40);
        for (const side of [-1, 1]) transform(butterflyWings, i * 2 + (side > 0 ? 1 : 0), x, y, z, side, 1, 1, a, side * flap, Math.PI / 2);
      });
      deer.forEach((animal, i) => {
        let fleeing = false, targetAngle = animal.angle;
        for (const actor of actors) {
          if (actor.faction === 'airship' || !actor.moving) continue;
          const dx = animal.x - actor.x, dz = animal.z - actor.z, distance = Math.hypot(dx, dz);
          if (distance < 27 * (actor.scale || 1)) { targetAngle = Math.atan2(dx || .01, dz || .01); animal.flee = 4; fleeing = true; break; }
        }
        animal.flee = Math.max(0, animal.flee - dt);
        const wandering = Math.sin(time * .19 + animal.phase) > .67, moving = animal.flee > 0 || wandering;
        if (!fleeing && animal.flee <= 0) {
          const dx = animal.homeX - animal.x, dz = animal.homeZ - animal.z;
          targetAngle = Math.hypot(dx, dz) > 15 ? Math.atan2(dx, dz) : animal.phase + Math.sin(time * .085 + i) * .7;
        }
        let turn = ((targetAngle - animal.angle + Math.PI * 3) % TAU) - Math.PI;
        animal.angle += turn * Math.min(1, dt * (animal.flee > 0 ? 5 : 1));
        if (moving && dt) {
          const speed = animal.flee > 0 ? 4.2 : .48, nx = animal.x + Math.sin(animal.angle) * speed * dt, nz = animal.z + Math.cos(animal.angle) * speed * dt;
          if (shoreDistance(nx, nz) > 5) { animal.x = nx; animal.z = nz; } else animal.angle += Math.PI * dt;
        }
        const s = animal.scale, y = terrainHeight(animal.x, animal.z), yaw = animal.angle;
        const forwardX = Math.sin(yaw), forwardZ = Math.cos(yaw), rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
        const bounce = moving ? Math.abs(Math.sin(time * (animal.flee > 0 ? 8 : 4) + i)) * .05 : 0;
        transform(deerBody, i, animal.x, y + 1.02 * s + bounce, animal.z, .47 * s, .54 * s, .94 * s, yaw);
        const breeze = windAt(time, animal.x, animal.z, windSample), grazing = !moving && Math.sin(time * .65 + i) > -.1 && breeze.gust < .83;
        transform(deerNeck, i, animal.x + forwardX * .69 * s, y + (grazing ? .84 : 1.43) * s, animal.z + forwardZ * .69 * s, .20 * s, .55 * s, .24 * s, yaw, 0, grazing ? -.67 : .40);
        transform(deerHead, i, animal.x + forwardX * 1.04 * s, y + (grazing ? .52 : 1.86) * s, animal.z + forwardZ * 1.04 * s, .25 * s, .23 * s, .43 * s, yaw, 0, grazing ? .5 : -.12);
        transform(deerMuzzles,i,animal.x+forwardX*1.36*s,y+(grazing?.37:1.81)*s,animal.z+forwardZ*1.36*s,.17*s,.14*s,.22*s,yaw,0,grazing?.5:-.12);
        for(const side of[-1,1])transform(deerEyes,i*2+(side>0?1:0),animal.x+forwardX*1.12*s+rightX*side*.223*s,y+(grazing?.60:1.94)*s,animal.z+forwardZ*1.12*s+rightZ*side*.223*s,.034*s,.033*s,.047*s,yaw);
        transform(deerTails, i, animal.x - forwardX * .95 * s, y + 1.07 * s, animal.z - forwardZ * .95 * s, .13 * s, .19 * s, .23 * s, yaw, Math.sin(time * 2 + i) * .3);
        for (let leg = 0; leg < 4; leg++) {
          const side = leg % 2 ? 1 : -1, front = leg < 2 ? 1 : -1;
          const lx = animal.x + rightX * side * .28 * s + forwardX * front * .61 * s, lz = animal.z + rightZ * side * .28 * s + forwardZ * front * .61 * s;
          transform(deerLegs, i * 4 + leg, lx, y + .45 * s, lz, .067 * s, .82 * s, .067 * s, yaw, 0, moving ? Math.sin(time * (animal.flee > 0 ? 8 : 4) + i + leg * Math.PI / 2) * .46 : 0);
        }
        const earFlick = Math.pow(Math.max(0, Math.sin(time * .8 + animal.phase)), 12) * .19;
        for (const side of [-1, 1]) transform(deerEars, i * 2 + (side > 0 ? 1 : 0), animal.x + forwardX * .98 * s + rightX * side * .20 * s, y + (grazing ? .77 : 2.13) * s, animal.z + forwardZ * .98 * s + rightZ * side * .20 * s, .12 * s, .25 * s, .055 * s, yaw, -side * (.44 + earFlick));
      });
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    },
    setQuality(quality) {
      const low = quality === 'retro' || quality === 'low'; butterflyWings.visible = !low;
      for (const mesh of meshes) mesh.castShadow = !low;
    }
  };
}
