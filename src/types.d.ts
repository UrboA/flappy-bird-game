/// <reference types="phaser" />

declare namespace Phaser {
    interface GameConfig {
        type: number;
        width: number;
        height: number;
        parent: string;
        physics: {
            default: string;
            arcade: {
                gravity: { y: number };
                debug: boolean;
            };
        };
        scene: {
            preload: () => void;
            create: () => void;
            update: () => void;
        };
    }

    interface Scene {
        add: Phaser.GameObjects.GameObjectFactory;
        physics: Phaser.Physics.Arcade.ArcadePhysics;
        input: Phaser.Input.InputPlugin;
        time: Phaser.Time.Clock;
        load: Phaser.Loader.LoaderPlugin;
    }

    namespace GameObjects {
        interface GameObjectFactory {
            sprite(x: number, y: number, texture: string): Phaser.Physics.Arcade.Sprite;
            image(x: number, y: number, texture: string): Phaser.GameObjects.Image;
            text(x: number, y: number, text: string, style: any): Phaser.GameObjects.Text;
        }
    }

    namespace Physics.Arcade {
        interface ArcadePhysics {
            sprite: any;
            group: any;
        }
    }

    namespace Input {
        interface InputPlugin {
            keyboard: Keyboard.KeyboardPlugin;
            on(event: string, fn: Function, context?: any): void;
        }

        namespace Keyboard {
            interface KeyboardPlugin {
                addKey(keyCode: number): Key;
            }
            interface Key {
                on(event: string, fn: Function, context?: any): void;
            }
            interface KeyCodes {
                SPACE: number;
            }
        }
    }
} 