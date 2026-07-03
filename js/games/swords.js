import * as THREE from 'three';


export class SwordsGame {

    constructor(handler) {

        this.handler = handler;

        this.scene = handler.scene;

        this.objects = [];

        this.enemy = null;

        this.swordGroup = null;

        this.isAttacking = false;

        this.blueScore = 0;

        this.redScore = 0;

        this.attackTimeout = null;

    }


    add(obj) {

        this.scene.add(obj);

        this.objects.push(obj);

    }


    build() {

        const river = new THREE.Mesh(

            new THREE.BoxGeometry(10, 0.1, 100),

            new THREE.MeshStandardMaterial({ color: 0x0044aa })

        );

        river.position.y = 0;

        river.receiveShadow = true;

        this.add(river);


        this.createCastle(-35, 0, 0x0033cc);

        this.createCastle(35, 0, 0xcc0000);


        document.getElementById('hud-leaderboard').style.display = 'block';

        document.getElementById('hud-leaderboard-title').textContent = 'Arena';

    }


    createCastle(x, z, teamColor) {

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xBFC7CC });

        const redMat = new THREE.MeshStandardMaterial({ color: 0xE91D2D });

        const teamMat = new THREE.MeshStandardMaterial({ color: teamColor });

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });


        const towerGeo = new THREE.BoxGeometry(8, 20, 8);

        const positions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];

        for (const p of positions) {

            const tower = new THREE.Mesh(towerGeo, stoneMat);

            tower.position.set(p[0], 10, p[1]); tower.castShadow = true; tower.receiveShadow = true;

            this.add(tower);


            for (let i = -3; i <= 3; i += 2) {

                const cren = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);

                cren.position.set(p[0] + i, 21, p[1] + 3.5); this.add(cren);

                const cren2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);

                cren2.position.set(p[0] + 3.5, 21, p[1] + i); this.add(cren2);

                const cren3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);

                cren3.position.set(p[0] + i, 21, p[1] - 3.5); this.add(cren3);

                const cren4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);

                cren4.position.set(p[0] - 3.5, 21, p[1] + i); this.add(cren4);

            }


            const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 4), redMat);

            roof.position.set(p[0], 25, p[1]); roof.castShadow = true;

            this.add(roof);


            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6), woodMat);

            pole.position.set(p[0], 32, p[1]); this.add(pole);

            const flag = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.1), teamMat);

            flag.position.set(p[0] + 2, 33, p[1]); this.add(flag);

        }


        const wallGeo = new THREE.BoxGeometry(22, 10, 2);

        const wall1 = new THREE.Mesh(wallGeo, stoneMat); wall1.position.set(0, 5, -15); this.add(wall1);

        const wall2 = new THREE.Mesh(wallGeo, stoneMat); wall2.position.set(0, 5, 15); this.add(wall2);

        const wall3 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall3.position.set(-15, 5, 0); this.add(wall3);

        const wall4 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall4.position.set(15, 5, 0); this.add(wall4);


        const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 28), teamMat);

        floor.position.y = 0.5; floor.receiveShadow = true;

        floor.position.x = x; floor.position.z = z;

        this.add(floor);

    }


    start() {

        if (this.handler.player) return;

        this.handler.initAudio();

        this.handler.createPlayer(0x0033cc, 0xffcc00, 0xffcc00, 0x001a33);

        this.handler.player.position.set(-35, 1, 0);

        this.createEnemy();

        this.setupCombat();

    }


    createEnemy() {

        this.enemy = this.handler.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000);

        this.enemy.position.set(35, 1, 0);

        this.scene.add(this.enemy);


        this.swordGroup = new THREE.Group();

        const handle = new THREE.Mesh(

            new THREE.BoxGeometry(0.3, 1, 0.3),

            new THREE.MeshStandardMaterial({ color: 0x333333 })

        );

        handle.position.y = -0.5;

        const guard = new THREE.Mesh(

            new THREE.BoxGeometry(1.2, 0.3, 0.3),

            new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 })

        );

        guard.position.y = 0.1;

        const blade = new THREE.Mesh(

            new THREE.BoxGeometry(0.5, 5, 0.1),

            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.9, roughness: 0.1 })

        );

        blade.position.y = 2.8;

        this.swordGroup.add(handle, guard, blade);

        this.swordGroup.position.set(0, -0.8, 0);

        this.swordGroup.rotation.x = Math.PI;

        this.handler.player.rightArmRef.add(this.swordGroup);

    }


    playSwordSound() {

        if (!this.handler.audioCtx) return;

        const ctx = this.handler.audioCtx;

        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);

        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);

        const source = ctx.createBufferSource();

        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';

        filter.frequency.setValueAtTime(1200, ctx.currentTime);

        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);

        filter.Q.value = 3;

        const gain = ctx.createGain();

        gain.gain.setValueAtTime(0.8, ctx.currentTime);

        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        source.connect(filter).connect(gain).connect(ctx.destination);

        source.start();

    }


    setupCombat() {

        this.isAttacking = false;

        const attackAction = () => { if (!this.isAttacking) this.attack(); };

        window.addEventListener('mousedown', (e) => { if (e.button === 0) attackAction(); });

        const btn = document.getElementById('attack-btn');

        if (btn) {

            btn.style.display = 'flex';

            btn.addEventListener('touchstart', (e) => { e.preventDefault(); attackAction(); });

            btn.addEventListener('click', attackAction);

        }

    }


    attack() {

        this.isAttacking = true;

        this.playSwordSound();

        let progress = 0;

        const attackInterval = setInterval(() => {

            progress += 0.15;

            this.handler.player.rightArmRef.rotation.x = -Math.PI / 2 * Math.sin(progress * Math.PI);

            if (progress >= 1) {

                clearInterval(attackInterval);

                this.handler.player.rightArmRef.rotation.x = 0;

                this.isAttacking = false;


                if (this.enemy && this.handler.player) {

                    const dx = this.enemy.position.x - this.handler.player.position.x;

                    const dz = this.enemy.position.z - this.handler.player.position.z;

                    if (Math.hypot(dx, dz) < 5) {

                        this.blueScore++;

                        const lb = document.getElementById('lb-blue');

                        if (lb) lb.textContent = this.blueScore;

                    }

                }

            }

        }, 20);

    }


    update() {}


    cleanup() {

        for (const obj of this.objects) this.scene.remove(obj);

        if (this.enemy) this.scene.remove(this.enemy);

        if (this.attackTimeout) clearTimeout(this.attackTimeout);

        const btn = document.getElementById('attack-btn');

        if (btn) btn.style.display = 'none';

        const lb = document.getElementById('hud-leaderboard');

        if (lb) lb.style.display = 'none';

    }

}


