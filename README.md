<p align="center">
  <img src="public/logo192.png" alt="Zag">
</p>

# Zag

[![release](https://img.shields.io/github/v/release/remarkablegames/zag)](https://github.com/remarkablegames/zag/releases)
[![build](https://github.com/remarkablegames/zag/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablegames/zag/actions/workflows/build.yml)

⚡ Zigzag your way forward!

Play the game on:

- [remarkablegames](https://remarkablegames.org/zag/)

Or download for desktop:

- [Windows](https://github.com/remarkablegames/zag/releases/latest/download/windows.zip)
- [macOS](https://github.com/remarkablegames/zag/releases/latest/download/macos.zip)
- [Linux](https://github.com/remarkablegames/zag/releases/latest/download/linux.zip)

## How to Play

The ball rolls along a narrow path that zigzags, turning 90 degrees with each line. Tap, click, or press **Space** to turn.

Time your turn just right. Turn too early or too late, and the ball falls off.

Earn 1 point for each line you cross. The ball speeds up as you play and your best score is saved.

## Controls

Turn with:

- Tap or click
- Space, Enter, or ↑
- Gamepad A

## Features

- Procedurally generated paths
- Mouse, touch, keyboard, and gamepad support
- Best score is saved to `localStorage`
- Speed that ramps up as you play
- A ball with a trail, squash-and-stretch turns, and a fall animation
- Sound effects for turns, scoring, falling, and game over
- Responsive design for desktop and mobile

## Credits

- [Lofi hip hop Volume 1](https://jjbbllkk.itch.io/lo-fi-hip-hop-volume-1) by [Jeremy Leaird-Koch](https://rmr.media/)

## Prerequisites

[nvm](https://github.com/nvm-sh/nvm#installing-and-updating):

```sh
brew install nvm
```

## Install

Clone the repository:

```sh
git clone https://github.com/remarkablegames/zag.git
cd zag
```

Install the dependencies:

```sh
npm install
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the game in the development mode.

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.

You will also see any errors in the console.

### `npm run build`

Builds the game for production to the `dist` folder.

It correctly bundles in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

Your game is ready to be deployed!

### `npm run bundle`

Builds the game and packages it into a Zip file in the `dist` folder.

Your game can be uploaded to your server, [itch.io](https://itch.io/), etc.
