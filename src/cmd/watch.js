'use strict';

import chokidar from 'chokidar';
import path from 'path';
import Sprites from '../sprites';
import log from '../utils/log';

class Task {
    constructor(sprites) {
        this.sprites = sprites;
        this.resource = sprites.getResource();
        this.lastLength = this.resource.length;
        this.todo = true;
    }
    check(p) {
        let resource = this.resource;

        if (resource.length !== this.lastLength) {
            this.todo = true;
            this.lastLength = resource.length;
        } else if (resource.indexOf(p) > -1) {
            this.todo = true;
        }
    }
    update() {
        this.resource = this.sprites.getResource();
    }
    run() {
        if(this.todo) {
            this.todo = false;
            this.sprites.run();
        }
    }
}

const wait = 1000;

let watching = {
    tasks: [],
    pond: [],
    ignores: [],
    main() {
        let config = [];
        let confPath = path.resolve(process.cwd(), 'sprites_conf.js');

        try {
            config = require(confPath);
        } catch (e) {
            log.warn('sprites_conf.js not found or something wrong. Try `sprites init`.');
        }

        config.map(conf => {
            let sprites = new Sprites(conf);
            let task = new Task(sprites);

            this.tasks.push(task);
            this.ignores.push(sprites._name(conf.image));
        });

        this.watch();
    },
    watch() {
        let timer = null;
        let pond = this.pond;
        let ignores = this.ignores.join('|');
        let ignored = new RegExp(ignores);

        chokidar.watch('**/*.png', {
            awaitWriteFinish: true,
            ignored
        }).on('all', (event, p) => {
            pond.push(p);

            clearTimeout(timer);
            timer = setTimeout(() => {
                this.monitor();
            }, wait);
        });
    },
    monitor() {
        let start = +new Date();
        let tasks = this.tasks;
        let pond = this.pond;

        tasks.map(t => t.update());

        while(pond.length) {
            let p = pond.shift();
            let realPath = path.resolve(process.cwd(), p);

            tasks.map(t => !t.todo && t.check(realPath));
        }

        tasks.map(t => t.run());

        let end = +new Date();

        log.info(`Finish in ${(end - start) / 1000}s. Waiting...`);
    }
}

export default function() {
    watching.main();
}