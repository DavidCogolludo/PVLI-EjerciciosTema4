// By Carlos León, 2016
// Licensed under Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)

'use strict';

//////////////////////////////////////////////////////////////////////////////

// Entity type to differentiate entities and have them attack those not
// belonging to the same kind
var EntityType = {
    GOOD: 0,
    EVIL: 1
};

// Entity constructor
// 
// Entities have a name (it doesn't have to be unique, but it helps) and a type
//
// Additionally, entities accept a list of instantiated components
function Entity(entityName, entityType, components) {
    var self = this;
    this.entityName = entityName;

    // Instead of assigning the parameter, we call `addComponent`, which is a
    // bit smarter than default assignment
    this.components = [];
    components.forEach(function(component) {
        self.addComponent(component);
    });
    this.type = entityType;
    this.status = 'able';
}

Entity.prototype.addComponent = function(component) {
    this.components.push(component);
    component.entity = this;
};

// This function delegates the tick on the components, gathering their messages
// and aggregating them into a single list of messages to be delivered by the
// message manager (the game itself in this case
Entity.prototype.tick = function() {
    var outcoming = [];
    var self = this;
    this.components.forEach(function(component) {
        var messages = component.tick();
        messages.forEach(function (message) {
            if (self.status === 'able')
            outcoming.push(message);
        });
    });
    return outcoming;
};

// All received messages are forwarded to the components
Entity.prototype.receive = function(message) {
    // If the receiver is `null`, this is a broadcast message that must be
    // accepted by all entities
    if(!message.receiver || message.receiver === this) {
        this.components.forEach(function(component) {
            component.receive(message);
        });
    }
};
//////////////////////////////////////////////////////////////////////////////
// if the receiver is null, it is a broadcast message
function Message(receiver) {
    this.receiver = receiver;
}

//////////////////////////////////////////////////////////////////////////////
function Component(entity) {
    this.entity = entity;
    this.messageQueue = [];
}

Component.prototype.tick = function() {
    // We return a copy of the `messageQueue`, and we empty it
    var aux = this.messageQueue;
    this.messageQueue = [];
    return aux;
};
Component.prototype.receive = function(message) {
};


//////////////////////////////////////////////////////////////////////////////

function Game(entities) {
    this.entities = entities;
    this.messageQueue = [];
}

Game.prototype.mainLoop = function (ticks) {
    var i = 0;
    function line() {
        console.log("-----------------------------------------");
    }
    while(!ticks || i < ticks) {
        line();
        console.log("Tick number " + i);
        line();
        this.tick();
        i++;
    }
};

Game.prototype.once = false;
// Each tick, all entities are notified by calling their `tick` function
Game.prototype.tick = function () {
    var self = this;

    // We create `Presence` messages for all entities to let others that they
    // exists in the game
    
   if (!this.once){
    	this.entities.forEach(function(entity) {
       	 self.messageQueue.push(new Presence(entity));
   	 });
    	this.once = true;
	}

    // All messages coming from the entities are put in the queue
    this.entities.forEach(function(entity) {
        var tickMessages = entity.tick();

        tickMessages.forEach(function(tickMessage) {
            self.messageQueue.push(tickMessage);
        });
    });

    this.deliver();
};


// All messages in the queue are delivered to all the entities
Game.prototype.deliver = function() {
    var self = this;

    this.messageQueue.forEach(function(message) {
        if(!message.receiver) {         
            self.entities.forEach(function(entity) {
                entity.receive(message);
            });
        }
        else {
            message.receiver.receive(message);
        }
    });

    this.messageQueue = [];
};

//////////////////////////////////////////////////////////////////////////////
// Components
//////////////////////////////////////////////////////////////////////////////
function Attacker(entity) {
    Component.call(this, entity);
}
Attacker.prototype = Object.create(Component.prototype);
Attacker.prototype.constructor = Attacker;

Attacker.prototype.receive = function(message) {
    if(message instanceof Presence) {
        if(message.who.type != this.entity.type) {
            this.messageQueue.push(new Attack(this.entity, message.who));
        }
    }
};

//////////////////////////////////////////////////////////////////////////////
function Defender(entity) {
    Component.call(this, entity);
}
Defender.prototype = Object.create(Component.prototype);
Defender.prototype.constructor = Defender;

Defender.prototype.receive = function(message) {
    if(message instanceof Attack) {
        console.log(this.entity.entityName + " was attacked by " + message.who.entityName);
    }
};
////////////////////////////////////////////////////////////////////////////////////
function Sleepy(entity) {
    Component.call(this, entity);
}
Sleepy.prototype = Object.create(Component.prototype);
Sleepy.prototype.constructor = Sleepy;

Sleepy.prototype.cont = 0;

Sleepy.prototype.receive = function(message) {
    if(message instanceof Sleep) {
        if(message.who.type != this.entity.type) {
            this.cont++;
            this.entity.status = 'disable';
            console.log(this.entity.entityName + " is sleeping");
        }
    }
    else if ( message instanceof WakeUp && message.who.name === this.entity.entityName){
        this.entity.status = 'able';
    }
    if (this.cont === 3){
        this.cont = 0;
        console.log(this.entity.entityName + " woke up");
     this.messageQueue.push(new WakeUp(this.entity, message.who));
 }
};
///////////////////////////////////////////////////////////////////////////////////
function Sleeper(entity) {
    Component.call(this, entity);
}
Sleeper.prototype = Object.create(Component.prototype);
Sleeper.prototype.constructor = Sleeper;

Sleeper.prototype.receive = function(message) {
    if(message instanceof Presence) {
        if(message.who.type != this.entity.type) {
            this.messageQueue.push(new Sleep(this.entity, message.who));
        }
    }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////
function Healer(entity) {
    Component.call(this, entity);
}
Healer.prototype = Object.create(Component.prototype);
Healer.prototype.constructor = Healer;

Healer.prototype.receive = function(message) {
    var self = this;
    if(message instanceof Heal) {
        if(this.entity.status === 'able' && message.who.entityName === this.entity.entityName) {
            self.entity.components[2].live += 5;
        }
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////
function Life (entity) {
    Component.call(this, entity);
}
Life.prototype = Object.create(Component.prototype);
Life.prototype.constructor = Life;

Life.prototype.live = 100;

Life.prototype.receive = function(message) {
    if(message instanceof Presence) {
        this.messageQueue.push(new Heal(this.entity, message.who));
        if (message.who.entityName === this.entity.entityName)
        console.log(this.entity.entityName + " life: " + this.live);
    }
};
/////////////////////////////////////////////////////////////////////////////////////////////////
function Witness (entity) {
    Component.call(this, entity);
}
Witness.prototype = Object.create(Component.prototype);
Witness.prototype.constructor = Witness;

Witness.prototype.receive = function(message) {
	
    if(message instanceof Presence ) {
       	this.messageQueue.push(new Presence(this.entity, message.who));
    }
};


//////////////////////////////////////////////////////////////////////////////
// Messages
//////////////////////////////////////////////////////////////////////////////
function Presence(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Presence.prototype = Object.create(Message.prototype);
Presence.prototype.constructor = Presence;
//////////////////////////////////////////////////////////////////////////////
function Attack(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Attack.prototype = Object.create(Message.prototype);
Attack.prototype.constructor = Attack;

//////////////////////////////////////////////////////////////////////////////
function Sleep(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Sleep.prototype = Object.create(Message.prototype);
Sleep.prototype.constructor = Sleep;
////////////////////////////////////////////////////////////////////
function WakeUp(who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
WakeUp.prototype = Object.create(Message.prototype);
WakeUp.prototype.constructor = WakeUp;
////////////////////////////////////////////////////////////////////
function Heal (who, receiver) {
    Message.call(this, receiver);
    this.who = who;
}
Heal.prototype = Object.create(Message.prototype);
Heal.prototype.constructor = Heal;
////////////////////////////////////////////////////////////////////


// helper functions creating new components
var attacker = function() { return new Attacker(); };
var defender = function() { return new Defender(); };
var sleepy = function () { return new Sleepy () ; };
var sleeper = function () { return new Sleeper (); };
var healer = function () { return new Healer (); };
var life = function () { return new Life (); };
var witness = function () {return new Witness (); };

// entities in the game
var link = new Entity("link", EntityType.GOOD, [ witness (), attacker(), defender(), sleepy(),life(), healer()]);
var ganon = new Entity("ganon", EntityType.EVIL, [witness (), attacker(), defender(), life(), healer()]);
var octorok = new Entity("octorok", EntityType.EVIL, [witness (), defender(), sleeper(), life(), healer()]);
var armos = new Entity("armos", EntityType.EVIL, [witness (), attacker(), life()]);

// we create the game with the entities
var game = new Game([link, ganon, armos, octorok]);

game.mainLoop(10);
