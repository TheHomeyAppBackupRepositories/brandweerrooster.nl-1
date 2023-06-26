# [@tuxjs/eventbus](https://github.com/tuxjs/tuxjs.eventbus.git) &middot; Event Bus for Javascript, Typescript

EventBus is library support subcribe and publish event in Javascript, Typescript

## Make sure your computer has a nodejs installed
Install nodejs in your computer [click here](https://nodejs.org/en/)

## How to install @tuxjs/eventbus

```bash

npm install @tuxjs/eventbus

npm install @tuxjs/eventbus --save-dev

```

# Guide use @tuxjs/eventbus in ES5

```javascript

const EventBus = require('@tuxjs/eventbus');

const sub = EventBus.subcribe('event', (value) => {
    console.log('value: ' + value);
});

EventBus.publish('event', 'Hello es5');

sub.unsubcribe();

EventBus.publish('event', 'Hello es5 again');

```

# Guide use @tuxjs/eventbus in ES6

```javascript

import EventBus, { Subcriber } from '@tuxjs/eventbus';

const eventBus = new EventBus();

var sub1:Subcriber  = eventBus.subcribe('event1', (value: any) => {
    console.log('1: ' + value);
});

eventBus.subcribe('event1', (value: any) => {
    console.log('1: ' + value);
});

eventBus.subcribe('event2', (value: any) => {
    console.log('2: ' + value);
});

eventBus.subcribe('event3', (value: any) => {
    console.log('3: ' + value);
});


eventBus.publish('event1', 1);
eventBus.publish('event2', 'hello es6');
eventBus.publish('event3', "Hi");

sub1.unsubcribe();

console.log('-----');

eventBus.publish('event1', 100);
eventBus.publish('event2', 'hello es6 again');
eventBus.publish('event3', "Say goodbye");

eventBus.getSubcribers()

```

### Thanks, click on the star button above to support me

Repository TuxJS-EventBus [click here](https://github.com/tuxjs/tuxjs.eventbus.git)