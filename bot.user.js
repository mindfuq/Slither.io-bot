/*
Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
// ==UserScript==
// @name         Slither.io-bot A*
// @namespace    http://slither.io/
// @version      0.9.4
// @description  Slither.io bot A*
// @author       Ermiya Eskandary & Théophile Cailliau
// @match        http://slither.io/
// @grant        none
// ==/UserScript==

// Custom logging function - disabled by default
window.log = function() {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

window.getPos = function() {
    return {
        x: window.snake.xx,
        y: window.snake.yy
    };
};

window.getSnakeLength = function() {
    return (Math.floor(150 * (window.fpsls[window.snake.sct] +
        window.snake.fam / window.fmlts[window.snake.sct] - 1) - 50) / 10);
};
window.getSnakeWidth = function(sc) {
    sc = sc || window.snake.sc;
    return sc * 14.5;
};
window.getSnakeWidthSqr = function(sc) {
    sc = sc || window.snake.sc;
    var width = window.getSnakeWidth();
    return width*width;
};

var canvas = (function() {
    return {
        // Ratio of screen size divided by canvas size.
        canvasRatio: {
            x: window.mc.width / window.ww,
            y: window.mc.height / window.hh
        },

        /*
        window.getWidth = function() {
            return window.ww;
        };
        window.getHeight = function() {
            return window.hh;
        };
        window.getX = function() {
            return window.snake.xx;
        };
        window.getY = function() {
            return window.snake.yy;
        };
        window.getScale: function() {
            return window.gsc;
        }, */

        /* Coordinates
        --- Screen coordinates ---
            X = 0 -> WindowWidth
            Y = 0 -> WindowHeight

        --- Mouse Coordinates ----
            X = -Width  -> snake.xx -> Width
            Y = -Height -> snake.yy -> Height

        --- Map Coordinates ------
            X = 0 -> MapWidth
            Y = 0 -> MapHeight

        --- Canvas Coordinates ---
            X = 0 -> CanvasWidth
            Y = 0 -> CanvasHeight
        */

        // Spoofs moving the mouse to the provided coordinates.
        setMouseCoordinates: function(point) {
            window.xm = point.x;
            window.ym = point.y;
        },

        // Convert snake-relative coordinates to absolute screen coordinates.
        mouseToScreen: function(point) {
            var screenX = point.x + (window.ww / 2);
            var screenY = point.y + (window.hh / 2);
            return {
                x: screenX,
                y: screenY
            };
        },

        // Convert screen coordinates to canvas coordinates.
        screenToCanvas: function(point) {
            var canvasX = window.csc *
                (point.x * canvas.canvasRatio.x) - parseInt(window.mc.style.left);
            var canvasY = window.csc *
                (point.y * canvas.canvasRatio.y) - parseInt(window.mc.style.top);
            return {
                x: canvasX,
                y: canvasY
            };
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function(point) {
            var mouseX = (point.x - window.snake.xx) * window.gsc;
            var mouseY = (point.y - window.snake.yy) * window.gsc;
            return {
                x: mouseX,
                y: mouseY
            };
        },

        // Map cordinates to Canvas cordinate shortcut
        mapToCanvas: function(point) {
            var c = canvas.mapToMouse(point);
            c = canvas.mouseToScreen(c);
            c = canvas.screenToCanvas(c);
            return c;
        },

        // Map to Canvas coordinate conversion for drawing circles.
        // Radius also needs to scale by .gsc
        circleMapToCanvas: function(circle) {
            var newCircle = canvas.mapToCanvas(circle);
            return canvas.circle(
                newCircle.x,
                newCircle.y,
                circle.radius * window.gsc
            );
        },

        // Constructor for circle type
        circle: function(x, y, r) {
            var c = {
                x: Math.round(x),
                y: Math.round(y),
                radius: Math.round(r)
            };
            return c;
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function(e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
            }
        },

        // Restores zoom to the default value.
        resetZoom: function() {
            window.gsc = 0.9;
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function(url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // Manual mobile rendering
        mobileRendering: function() {
            // Set render mode
            if (window.mobileRender) {
                canvas.setBackground(
                    'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs'
                );
                window.render_mode = 1;
                window.want_quality = 0;
                window.high_quality = false;
            } else {
                canvas.setBackground();
                window.render_mode = 2;
                window.want_quality = 1;
                window.high_quality = true;
            }
        },

        // Draw a circle on the canvas.
        drawCircle: function(circle, color, fill, alpha) {
            if (alpha === undefined) alpha = 1;
            if (circle.radius === undefined) circle.radius = 5;

            var context = window.mc.getContext('2d');
            var drawCircle = canvas.circleMapToCanvas(circle);

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.strokeStyle = color;
            context.arc(drawCircle.x, drawCircle.y, drawCircle.radius,
                0, Math.PI * 2);
            context.stroke();
            if (fill) {
                context.fillStyle = color;
                context.fill();
            }
            context.restore();
        },

        // Draw a rectangle
        drawRect: function(x, y, width, height, color, alpha) {
            if (alpha === undefined) alpha = 1;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.rect(x, y, width, height);
            context.fillStyle = color;
            context.fill();
            context.restore();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {bool} danger -- green if false, red if true
        drawAngle: function(start, angle, danger, alpha) {
            if (alpha === undefined) alpha = 0.6;

            var context = window.mc.getContext('2d');

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2,
                window.gsc * 100, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.fillStyle = (danger) ? 'red' : 'green';
            context.fill();
            context.restore();
        },

        // Draw a line on the canvas.
        // context.strokeStyle = (color === 'green') ? '#00FF00' : '#FF0000';
        drawLine: function(p1, p2, color, width) {
            if (width === undefined) width = 5;

            var context = window.mc.getContext('2d');
            var dp1 = canvas.mapToCanvas(p1);
            var dp2 = canvas.mapToCanvas(p2);

            context.save();
            context.beginPath();
            context.lineWidth = width * window.gsc;
            context.strokeStyle = color;
            context.moveTo(dp1.x, dp1.y);
            context.lineTo(dp2.x, dp2.y);
            context.stroke();
            context.restore();
        },

        // Check if a point is between two vectors.
        // The vectors have to be anticlockwise (sectorEnd on the left of sectorStart).
        isBetweenVectors: function(point, sectorStart, sectorEnd) {
            var center = window.getPos();
            if (point.xx) {
                // Point coordinates relative to center
                var relPoint = {
                    x: point.xx - center.x,
                    y: point.yy - center.y
                };
                return (!canvas.areClockwise(sectorStart, relPoint) &&
                    canvas.areClockwise(sectorEnd, relPoint));
            }
            return false;
        },

        // Angles are given in radians. The overall angle (endAngle-startAngle)
        // cannot be above Math.PI radians (180°).
        isInsideAngle: function(point, startAngle, endAngle) {
            // calculate normalized vectors from angle
            var startAngleVector = {
                x: Math.cos(startAngle),
                y: Math.sin(startAngle)
            };
            var endAngleVector = {
                x: Math.cos(endAngle),
                y: Math.sin(endAngle)
            };
            // Use isBetweenVectors to check if the point belongs to the angle
            return canvas.isBetweenVectors(point, startAngleVector, endAngleVector);
        },

        /*
         * Given two vectors, return a truthy/falsy value depending
         * on their position relative to each other.
         */
        areClockwise: function(vector1, vector2) {
            // Calculate the dot product.
            return -vector1.x * vector2.y + vector1.y * vector2.x > 0;
        },

        // Get distance
        getDistance: function(x1, y1, x2, y2) {
            var distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(
                y1 - y2, 2));
            return distance;
        },

        // Get distance squared
        getDistance2: function(x1, y1, x2, y2) {
            var distance2 = Math.pow(x1 - x2, 2) + Math.pow(
                y1 - y2, 2);
            return distance2;
        },

        // Given an object (of which properties xx and yy are not null),
        // return the object with an additional property 'distance'.
        getDistanceFromSnake: function(point) {
            point.distance = canvas.getDistance(window.snake.xx,
                window.snake.yy, point.xx, point.yy);
            return point;
        },

        // Same as above, uses squared distance
        getDistance2FromSnake: function(point) {
            point.distance = canvas.getDistance2(window.snake.xx,
                window.snake.yy, point.xx, point.yy);
            return point;
        },

        // Get distance squared, NO IT IS NOT??? BTW: not used anymore
        getDotProduct: function(x1, y1, x2, y2) {
            return x1*x2 + y1*y2;
        },

        // normalVector, necessary for getRelativeAngle()
        getNormalVector: function(from, to) {
            var dir = {x: to.x-from.x, y: to.y-from.y};
            var len = dir.x*dir.x + dir.y*dir.y;
            len = Math.sqrt(len);
            dir.x /= len;
            dir.y /= len;
            dir.len = len;
            return dir;
        },

        // relativeAngle
        getRelativeAngle: function(from, to) {
            var norm = canvas.getNormalVector(from, to);
            norm.dot = norm.x * bot.heading.x + norm.y * bot.heading.y;
            return norm;
        },

        // atan2, not used anymore?
        getAtan2: function(y, x) {
            const QPI = Math.PI / 4;
            const TQPI = 3 * Math.PI / 4;
            var r = 0.0;
            var angle = 0.0;
            var abs_y = Math.abs(y) + 1e-10;

            if (x < 0) {
                r = (x + abs_y) / (abs_y - x);
                angle = TQPI;
            } else {
                r = (x - abs_y) / (x + abs_y);
                angle = QPI;
            }

            angle += (0.1963 * r * r - 0.9817) * r;

            if (y < 0) {
                return -angle;
            }

            return angle;
        }
    };
})();
var bot = (function() {
    // Save the original slither.io onmousemove function so we can re enable it back later
    var original_onmousemove = window.onmousemove;

    return {
        ranOnce: false,
        tickCounter: 0,
        isBotRunning: false,
        isBotEnabled: true,
        currentPath: [],
        radarResults: [],
        followLine: 0,
        behaviorData: {
            foodTarget: 0,
            followTime: 0,
            followCoordinates: {x: 0, y: 0},
            goalCoordinates: {x: 0, y: 0},
            aggressor: 0
        },

        hideTop: function () {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style
                    .width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    nsidivs[i].style.zIndex = -1;
                    bot.isTopHidden = true;
                }
            }
        },

        startBot: function() {
            if (window.autoRespawn && !window.playing && bot.isBotEnabled &&
                bot.ranOnce && !bot.isBotRunning && window.snake !== null)) {
                bot.connectBot();
                /* The lastscore should be checked here in the future,
                but not only when bot, just when not playing.
                THIS SHOULD ONLY BE EXECUTED ONCE! */
                userInterface.saveScore(); // Checks highscore
            }
            if (window.bso !== undefined) {
                window.ip_overlay.innerHTML = window.spanstyle +
                    'Server: ' + window.bso.ip + ':' + window.bso.po + '</span>';
            }
        },

        launchBot: function() {
            window.log('Starting Bot.');
            bot.isBotRunning = true;
            // Update the HUD
            userInterface.onPrefChange();

            //if( collisionGrid.grid.length == 0 ) {
                collisionGrid.init(100, 100, 30);
            //}
            /*
             * Removed the onmousemove listener so we can
             * move the snake manually by setting coordinates
             */
            window.onmousemove = function() {};
        },

        // Stops the bot
        stopBot: function() {
            window.setAcceleration(0); // Stop boosting
            // Re-enable the original onmousemove function
            window.onmousemove = original_onmousemove;

            window.log('Stopping Bot.');
            bot.isBotRunning = false;
            // Update the HUD
            userInterface.onPrefChange();
        },

        // Connects the bot
        connectBot: function() {
            if (!window.autoRespawn) return;
            bot.stopBot(); // Just in case
            window.log('Connecting...');
            window.connect();

            // Wait until we're playing to start the bot
            window.botCanStart = setInterval(function() {
                if (window.playing) {
                    bot.launchBot();
                    clearInterval(window.botCanStart);
                }
            }, 100);
        },

        forceConnect: function() {
            if (!window.connect) {
                return;
            }
            window.forcing = true;
            if (!window.bso) {
                window.bso = {};
            }
            window.currentIP = window.bso.ip + ':' + window.bso.po;
            var srv = window.currentIP.trim().split(':');
            window.bso.ip = srv[0];
            window.bso.po = srv[1];
            window.connect();
        },

        quickRespawn: function() {
            window.dead_mtm = 0;
            window.login_fr = 0;
            bot.forceConnect();
            if (!bot.isBotRunning) {
                bot.launchBot();
                bot.isBotEnabled = true;
            }
        },

        changeSkin: function() {
            if (window.playing && window.snake !== null) {
                var skin = window.snake.rcv;
                var max = window.max_skin_cv;
                skin++;
                if (skin > max) {
                    skin = 0;
                }
                window.setSkin(window.snake, skin);
            }
        },

        rotateSkin: function() {
            if (!window.rotateskin) {
                return;
            }
            bot.changeSkin();
            setTimeout(bot.rotateSkin, 500);
        },

        heading: {x:1, y:0},
        prevAng: 0,

        precalculate: function() {
            var rang = window.snake.ang;// * collisionHelper.toRad;
            bot.heading.x = Math.cos(rang);
            bot.heading.y = Math.sin(rang);

            if( bot.prevAng != window.snake.ang ) {
                bot.prevAng = window.snake.ang;
                //console.log("Angle = " + window.snake.ang);
            }
        },

        // Called by the window loop, this is the main logic of the bot.
        thinkAboutGoals: function() {
            // If no enemies or obstacles, go after what you are going after

            bot.precalculate();
            //window.setAcceleration(0);

            // Save CPU by only calculating every Nth frame
            //if (++bot.tickCounter >= 15) {
            bot.tickCounter = 0;

            collisionGrid.setup();

            behaviors.run('snakebot', bot.behaviorData);

            if( window.visualDebugging ) {
                var curpos = window.getPos();

                var canvasPosA = {
                    x: curpos.x,
                    y: curpos.y,
                    radius: 1
                };
                var canvasPosB = {
                    x: curpos.x + bot.heading.x*100,
                    y: curpos.y + bot.heading.y*100,
                    radius: 1
                };

                canvas.drawLine(canvasPosA, canvasPosB, 'yellow', 2);
            }
            //bot.astarFoodFinder();
        },

    };
})();

var userInterface = (function() {
    // Save the original event listeners so we can reenable them later.
    var original_keydown = document.onkeydown;
    // eslint-disable-next-line no-unused-vars
    var original_onmouseDown = window.onmousedown;
    // As well as the original slither.io game functions so we can modify them
    var original_oef = window.oef;
    var original_redraw = window.redraw;

    window.oef = function() {};
    window.redraw = function() {};

    // Modify the redraw()-function to remove the zoom altering code.
    var original_redraw_string = original_redraw.toString();
    var new_redraw_string = original_redraw_string.replace(
        'gsc!=f&&(gsc<f?(gsc+=2E-4,gsc>=f&&(gsc=f)):(gsc-=2E-4,gsc<=f&&(gsc=f)))', '');
    var new_redraw = new Function(new_redraw_string.substring(
        new_redraw_string.indexOf('{') + 1, new_redraw_string.lastIndexOf('}')));

    return {
        // var array = [{score: 1, date: Mar 12 2012 10:00:00 AM, version: x.y},...];
        scores: [],

        // Save variable to local storage
        savePreference: function(item, value) {
            window.localStorage.setItem(item, value);
        },

        // Load a variable from local storage
        loadPreference: function(preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem === 'true') {
                    window[preference] = true;
                } else if (savedItem === 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' +
                    window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference +
                    '. Used default: ' + window[preference]);
            }
            return window[preference];
        },

        // Add classes to hide or show the overlay
        hideMenu: function() {
            var elements = document.querySelectorAll('.hideable');
            elements = elements.length ? elements : [elements];
            if(window.hidden) {
                for (var index = 0; index < elements.length; index++) {
                    window.log('hide tag' . index);
                    elements[index].style.display = 'none';
                }
            } else {
                for (var index = 0; index < elements.length; index++) {
                    window.log('show tag' . index);
                    elements[index].style.display = 'block';
                }
            }
        },

        // Execute functions when you click on "Play" button
        playButtonClickListener: function() {
            userInterface.saveNick(); // Saves username
            userInterface.saveScore(); // Checks highscore
            userInterface.loadPreference('autoRespawn', false);
        },

        // Preserve nickname
        saveNick: function() {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Preserve highscore
        saveScore: function() {
            // Check if the lastscore was set
            if (document.getElementById('lastscore').childNodes.length > 1) {
                // Check for excisting highscore, if not, use 1 (because minimum length)
                var highScore = parseInt(userInterface.loadPreference('highscore', 1));
                window.log('HighScore: ' + highScore);
                // Retrieve the last, current score
                var lastScore = parseInt(
                    document.getElementById('lastscore').childNodes[1].innerHTML);
                window.log('LastScore: ' + lastScore);
                // Check if the current score is bigger than the highscore
                if (lastScore > highScore) {
                    // Set the currentscore as the highscore
                    userInterface.savePreference('highscore', lastScore);
                    window.log('New highscore! Score set to ' + lastScore);
                    // Display Personal HighScore
                    window.highscore_overlay.innerHTML = window.spanstyle +
                        'Your highscore: ' + lastScore + '</span>';
                }
                // Display LastScore
                window.lastscore_overlay.innerHTML = window.spanstyle +
                    'Your last score: ' + lastScore + '</span>';

                // Push the last score in the array
                userInterface.scores.push(lastScore);
                // Sort the scores in descending order
                userInterface.scores.sort(function(a, b) { return b - a; });

                // Show the scores on screen
                userInterface.showScores();

                /* Maybe we should use a 2d array to store the moment and bot version
                var today = new Date();
                var dd = today.getDate();
                if(dd<10) {
                    dd='0'+dd;
                }
                var mm = today.getMonth()+1; //January is 0!
                if(mm<10) {
                    mm='0'+mm;
                }
                var yyyy = today.getFullYear();
                today = mm+'/'+dd+'/'+yyyy;
                // eslint-disable-next-line no-undef
                userInterface.scores.push([lastScore, today, GM_info.script.version]);
                userInterface.scores.sort(function(a, b) { return b[0] - a[0]; })*/
            }
        },

        // Update scores overlay, based on code from @j-c-m, released under MIT License.
        // https://github.com/j-c-m/Slither.io-bot/blob/1dd9dd3/bot.user.js#L1036
        showScores: function() {
            var scoresOverlay;

            if (userInterface.scores.length === 0) {
                scoresOverlay = 'There aren\'t any scores yet,<br>go play!';
            } else {
                var avg = Math.round(
                    userInterface.scores.reduce(function(a, b) { return a + b; }) /
                    (userInterface.scores.length));

                scoresOverlay = 'games played: ' + userInterface.scores.length +
                    '<br>avg score: ' + avg;

                for (var i = 0; i < userInterface.scores.length && i < 10; i++) {
                    scoresOverlay += '<br>' + (i + 1) + '. ' + userInterface.scores[i];
                }
            }

            window.scores_overlay.innerHTML = window.spanstyle + scoresOverlay + '</span>';
        },

        // Add interface elements to the page.
        // @param {string} id
        // @param {string} className
        // @param style
        appendDiv: function(id, className, style) {
            var div = document.createElement('div');
            if (id) div.id = id;
            if (className) div.className = className;
            if (style) div.style = style;
            document.body.appendChild(div);
        },

        // Hide top score
        hideTop: function() {
            var nsidivs = document.querySelectorAll('div.nsi');
            for (var i = 0; i < nsidivs.length; i++) {
                if (nsidivs[i].style.top === '4px' && nsidivs[i].style.width === '300px') {
                    nsidivs[i].style.visibility = 'hidden';
                    nsidivs[i].style.zIndex = -1;
                    // bot.isTopHidden = true;
                }
            }
        },

        // Store FPS data
        framesPerSecond: {
            startTime: 0,
            frameNumber: 0,
            filterStrength: 40,
            lastLoop: 0,
            frameTime: 0,
            getFPS: function() {
                var thisLoop = performance.now();
                var thisFrameTime = thisLoop - this.lastLoop;
                this.frameTime += (thisFrameTime - this.frameTime) /
                    this.filterStrength;
                this.lastLoop = thisLoop;
                return (1000 / this.frameTime).toFixed(0);
            }
        },
        onmouseup: function() {
            window.setAcceleration(0);
        },
        onkeydown: function(e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            // We should always be able to toggle overlay with 'H'
            if (e.keyCode == 72) {
                window.hideAll = !window.hideAll;
                window.log('Hiding overlay set to: ' + window.hideAll);
                userInterface.savePreference('hideAll', window.hideAll);
                userInterface.hideMenu();
            }
            if (window.playing) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    if (bot.isBotRunning) {
                        bot.stopBot();
                        bot.isBotEnabled = false;
                    } else {
                        bot.launchBot();
                        bot.isBotEnabled = true;
                    }
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging',
                        window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' +
                        window.visualDebugging);
                    userInterface.savePreference('visualDebugging',
                        window.visualDebugging);
                }
                // Letter 'G' to toggle griddebugging (visual)
                if (e.keyCode === 71) {
                    window.gridDebugging = !window.gridDebugging;
                    console.log('Grid debugging set to: ' +
                        window.gridDebugging);
                    userInterface.savePreference('gridDebugging',
                        window.gridDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    console.log('Automatic Respawning set to: ' +
                        window.autoRespawn);
                    userInterface.savePreference('autoRespawn',
                        window.autoRespawn);
                }
                // Letter 'W' to auto rotate skin
                if (e.keyCode === 87) {
                    window.rotateskin = !window.rotateskin;
                    console.log('Auto skin rotator set to: ' +
                        window.rotateskin);
                    userInterface.savePreference('rotateskin',
                        window.rotateskin);
                    bot.rotateSkin();
                }
                // Letter 'X' to change skin
                if (e.keyCode === 88) {
                    bot.changeSkin();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    window.mobileRender = !window.mobileRender;
                    window.log('Mobile rendering set to: ' + window.mobileRender);
                    userInterface.savePreference('mobileRender', window.mobileRender);
                    canvas.mobileRendering();
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode === 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode === 27) {
                    bot.quickRespawn();
                }
                // Save nickname when you press "Enter"
                if (e.keyCode === 13) {
                    userInterface.saveNick();
                }
                /*
                if (e.keyCode === 66) {
                    var tekst = "<table id='score'>" +
                        "<tr><th>Score</th><th>Date</th><th>bot version</th></tr>";
                    for (i = 0; i < userInterface.scores.length; i++) {
                        tekst += "<tr><td>" + userInterface.scores[i][0] +
                        "</td><td>" + userInterface.scores[i][1] +
                        "</td><td>" + userInterface.scores[i][2] + "</td></tr>";
                    }
                    tekst += "</table>";
                    var scores_window = window.open('/',
                        'Your personal highscores', 'width=300,height=300');
                    scores_window.document.write(tekst);
                } */
                userInterface.onPrefChange(); // Update the bot status
            }
        },

        onmousedown: function(e) {
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        window.setAcceleration(1);
                        window.log('Manual boost...');
                        break;
                    // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        if (bot.isBotRunning) {
                            bot.stopBot();
                            bot.isBotEnabled = false;
                        } else {
                            bot.launchBot();
                            bot.isBotEnabled = true;
                        }
                        userInterface.onPrefChange(); // Update the bot status
                        break;
                }
            }
        },

        onPrefChange: function() {
            window.botstatus_overlay.innerHTML = window.spanstyle +
                '(T / Right Click) Bot: </span>' + userInterface.handleTextColor(
                    bot.isBotRunning);
            window.visualdebugging_overlay.innerHTML = window.spanstyle +
                '(Y) Visual debugging: </span>' + userInterface.handleTextColor(
                    window.visualDebugging);
            window.grid_debugging_overlay.innerHTML = window.spanstyle +
                '(G) Grid debugging: </span>' + userInterface.handleTextColor(
                    window.gridDebugging);
            window.logdebugging_overlay.innerHTML = window.spanstyle +
                '(U) Log debugging: </span>' + userInterface.handleTextColor(
                    window.logDebugging);
            window.autorespawn_overlay.innerHTML = window.spanstyle +
                '(I) Auto respawning: </span>' + userInterface.handleTextColor(
                    window.autoRespawn);
            window.rotateskin_overlay.innerHTML = window.spanstyle +
                '(W) Auto skin rotator: </span>' + userInterface.handleTextColor(
                    window.rotateskin);
            window.rendermode_overlay.innerHTML = window.spanstyle +
                '(O) Mobile rendering: </span>' + userInterface.handleTextColor(
                    window.mobileRender);
        },

        onFrameUpdate: function() {
            // Botstatus overlay
            window.fps_overlay.innerHTML = window.spanstyle + 'FPS: ' +
                userInterface.framesPerSecond.getFPS() + '</span>';

            if (window.position_overlay && window.playing) {
                // Display the X and Y of the snake
                window.position_overlay.innerHTML = window.spanstyle +
                    'X: ' + (Math.round(window.snake.xx) || 0) +
                    ' Y: ' + (Math.round(window.snake.yy) || 0) +
                    '</span>';
            }

            /*
            if (window.playing && window.visualDebugging && bot.isBotRunning) {
                // Only draw the goal when a bot has a goal.
                if (bot.behaviorData.goalCoordinates) {
                    var headCoord = {
                        x: window.snake.xx,
                        y: window.snake.yy
                    };
                    canvas.drawLine(headCoord, bot.behaviorData.goalCoordinates, 'green');

                    canvas.drawCircle(bot.behaviorData.goalCoordinates, 'red', true);
                }
            } */
        },

        oefTimer: function() {
            // Original slither.io oef function + whatever is under it
            // requestAnimationFrame(window.loop);
            original_oef();
            new_redraw();
            if (bot.isBotRunning) window.loop();
            userInterface.onFrameUpdate();
        },

        // Quit to menu
        quit: function() {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        // Update the relation between the screen and the canvas.
        onresize: function() {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvas.canvasRatio = {
                x: window.mc.width / window.ww,
                y: window.mc.height / window.hh
            };
        },

        handleTextColor: function(enabled) {
            return '<span style=\"opacity: 0.8; color:' + (enabled ?
                    'green;\">enabled' : 'red;\">disabled') +
                '</span>';
        }
    };
})();

// Loop for running the bot
window.loop = function() {
    // If the game and the bot are running
    if (window.playing && bot.isBotEnabled) {
        bot.ranOnce = true;
        bot.thinkAboutGoals();
    } else {
        bot.stopBot();
    }
};

window.sosBackup = sos;

// Main
(function() {
    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    userInterface.loadPreference('rotateskin', false);
    // Check if things should be hidden
    userInterface.loadPreference('hideAll', false);
    window.nick.value = userInterface.loadPreference('savedNick',
        'Slither.io-bot');

    // Overlays
    window.generalstyle =
        'color: #FFF; font-family: Arial, \'Helvetica Neue\',' +
        ' Helvetica, sans-serif; font-size: 14px; position: fixed; z-index: 7;';
    /*if(!window.hideAll) {
+        window.generalstyle =
        'color: #FFF; font-family: Arial, \'Helvetica Neue\',' +
        ' Helvetica, sans-serif; font-size: 14px; position: fixed; z-index: 7;';
+    } else {
+        window.generalstyle = 'display: none;' +
        ' color: #FFF; font-family: Arial, \'Helvetica Neue\',' +
        ' Helvetica, sans-serif; font-size: 14px; position: fixed; z-index: 7;';
+    }*/

    window.spanstyle = '<span style = "opacity: 0.35";>';

    // Top left
    userInterface.appendDiv('version_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 50px;');
    userInterface.appendDiv('botstatus_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 65px;');
    userInterface.appendDiv('visualdebugging_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 80px;');
    userInterface.appendDiv('logdebugging_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 95px;');
    userInterface.appendDiv('autorespawn_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 110px;');
    userInterface.appendDiv('rendermode_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 125px;');
    userInterface.appendDiv('rotateskin_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 140px;');
    userInterface.appendDiv('resetzoom_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 155px;');
    userInterface.appendDiv('scroll_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 170px;');
    userInterface.appendDiv('grid_debugging_overlay', 'nsi', window.generalstyle +
        'left: 30; top: 185px;');
    userInterface.appendDiv('changeskin_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 200px;');
    userInterface.appendDiv('quittomenu_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 215px;');
    userInterface.appendDiv('quickResp_overlay', 'nsi hideable', window.generalstyle +
        'left: 30; top: 230px;');
    userInterface.appendDiv('hidemenu_overlay', 'nsi', window.generalstyle +
        'left: 30; top: 245px;');

    // Bottom right
    userInterface.appendDiv('position_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 120px;');
    userInterface.appendDiv('ip_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 150px;');
    userInterface.appendDiv('fps_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 170px;');
    userInterface.appendDiv('highscore_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 200px;');
    userInterface.appendDiv('lastscore_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 220px;');
    userInterface.appendDiv('scores_overlay', 'nsi', window.generalstyle +
        'right: 30; bottom: 250px;');

    // Set static display options here.
    window.resetzoom_overlay.innerHTML = window.spanstyle +
        '(Z) Reset zoom </span>';
    window.scroll_overlay.innerHTML = window.spanstyle +
        '(Mouse Wheel) Zoom in/out </span>';
    window.changeskin_overlay.innerHTML = window.spanstyle +
        '(X) Change skin </span>';
    window.quittomenu_overlay.innerHTML = window.spanstyle +
        '(Q) Quit to menu </span>';
    window.quickResp_overlay.innerHTML = window.spanstyle +
        '(ESC) Quick Respawn </span>';
    window.hidemenu_overlay.innerHTML = window.spanstyle +
        '(H) Hide menu </span>';
    window.version_overlay.innerHTML = window.spanstyle +
        // eslint-disable-next-line no-undef
        'Version: ' + GM_info.script.version + '</span>';

    // Check for excisting highscore, if not, do not display it
    var highScore = parseInt(userInterface.loadPreference('highscore', false));
    if(highScore) {
        window.highscore_overlay.innerHTML = window.spanstyle +
            'Your highscore: ' + highScore + '</span>';
    }
    // Since there is no last score the first time, do not show one

    // Hide top score
    userInterface.hideTop();

    // Pref display
    userInterface.onPrefChange();

    // Hand over existing event listeners

    document.onkeydown = userInterface.onkeydown;
    window.onmousedown = userInterface.onmousedown;
    window.onresize = userInterface.onresize;
    window.addEventListener('mouseup', userInterface.onmouseup);
    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);
    // Listener for the play button
    window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);

    // Apply previous mobile rendering status.
    canvas.mobileRendering();

    // Unblocks all skins without the need for FB sharing.
    userInterface.savePreference('edttsg', '1');

    // Remove social
    window.social.remove();

    // Start!
    bot.launchBot();
    setInterval(bot.startBot, 1000);
    setInterval(userInterface.oefTimer, 30);
})();


/**
 *  Grid Node
 *  Types:
 *  0 = empty
 *  1 = snake
 *  2 = food
 */
var TYPE_EMPTY = 0;
var TYPE_SNAKE = 1;
var TYPE_FOOD = 2;

function GridNode(x, y, weight, type) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.f = 0;
    this.g = 0;
    this.h = 0;
    this.visited = false;
    this.closed = false;
    this.parent = null;
    this.type = type || 0;
    this.items = [];
}

GridNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function(fromNeighbor) {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x != this.x && fromNeighbor.y != this.y) {
        return this.weight * 1.41421;
    }
    return this.weight;
};

GridNode.prototype.isWall = function() {
    return this.weight === 0;
};
// javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html
(function(definition) {
  /* global module, define */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define([], definition);
  } else {
    var exports = definition();
    window.astar = exports.astar;
  }
})(function() {

function pathTo(node) {
  var curr = node;
  var path = [];
  while (curr.parent) {
    path.unshift(curr);


    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap(function(node) {
    return node.f;
  });
}

var astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Graph} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(start, end, options) {
    //collisionGrid.cleanDirty();
    options = options || {};
    var heuristic = options.heuristic || astar.heuristics.manhattan;
    var closest = options.closest || false;

    var openHeap = getHeap();
    var closestNode = start; // set the start node to be the closest if required

    start.h = heuristic(start, end);
    var maxtries = 10000;
    var trynum = 0;

    openHeap.push(start);

    while (openHeap.size() > 0) {
        if( ++trynum > maxtries ) {
            return [];
        }
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      var currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode.x == end.x && currentNode.y == end.y) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      var neighbors = collisionGrid.neighbors(currentNode.x, currentNode.y);

      for (var i = 0, il = neighbors.length; i < il; ++i) {
        var neighbor = neighbors[i];

        if (neighbor.closed || neighbor.type == TYPE_SNAKE) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        var gScore = currentNode.g + neighbor.weight;//getCost(currentNode);
        var beenVisited = neighbor.visited;
        if( beenVisited ) {
            //console.log('visited ('+neighbor.x+','+neighbor.y+')');
        }
        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          if (closest) {
            // If the neighbour is closer than the current closestNode or if it's equally close but has
            // a cheaper path than the current closest node then it becomes the closest node
            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
              closestNode = neighbor;
            }
          }

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    if (closest) {
      return pathTo(closestNode);
    }

    // No result was found - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristics: {
    manhattan: function(pos0, pos1) {
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return d1 + d2;
    },
    diagonal: function(pos0, pos1) {
      var D = 1;
      var D2 = 1.41421; // 1.41421 == Math.sqrt(2)
      var d1 = Math.abs(pos1.x - pos0.x);
      var d2 = Math.abs(pos1.y - pos0.y);
      return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
    },
    chebyshev: function(pos0, pos1) {
        var d1 = Math.abs(pos1.x - pos0.x);
        var d2 = Math.abs(pos1.y - pos0.y);
        return Math.max(d1,d2);
    }
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  }
};


function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },
  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },
  remove: function(node) {
    var i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    var end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  },
  size: function() {
    return this.content.length;
  },
  rescoreElement: function(node) {
    this.sinkDown(this.content.indexOf(node));
  },
  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      var parentN = ((n + 1) >> 1) - 1;
      var parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },
  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length;
    var element = this.content[n];
    var elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) << 1;
      var child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      var swap = null;
      var child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N];
        var child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};

return {
  astar: astar
};

});


var collisionHelper = (function() {
    return {
        unitTable: [],
        toRad: Math.PI / 180,
        toDeg: 180 / Math.PI,

        init: function() {
            collisionHelper.generateUnitTable();

        },

        /**
         *  Build the unit table grouping opposite angles and in 22.5 degree increments
         *
         */
        generateUnitTable: function() {
            var offset = 0;
            for(var a=0;a<360; a++) {
                var angle = collisionHelper.toRad * offset;
                collisionHelper.unitTable.push([Math.cos(angle), Math.sin(angle)]);
                offset++;
            }
        },

        /**
         * Performs line scans in the E,N,W,S directions and rotates by 22.5 degrees * rotateCount
         *
         */
        radarScan: function(angleIncrement,scanDist) {

            var results = [];
            var collisions = [];
            var open = [];
            var curpos = window.getPos();
            for(var dir=0; dir<collisionHelper.unitTable.length; dir+=angleIncrement) {
                var pos = collisionHelper.unitTable[dir];
                var x2 = curpos.x+pos[0]*scanDist;
                var y2 = curpos.y+pos[1]*scanDist;

                var result = collisionGrid.lineTest(curpos.x,curpos.y,x2,y2,TYPE_SNAKE);
                if( result )
                    results.push(result);

                if( result.cell ) {
                    var linePos = collisionGrid.getCellByColRow(result.col, result.row);
                    var dist = canvas.getDistance2(curpos.x, curpos.y, linePos.x, linePos.y);
                    collisions.push({dist:dist, line:result});
                }
                else
                    open.push(result);

                if( window.visualDebugging ) {

                    var canvasPosA = canvas.mapToCanvas({
                        x: curpos.x,
                        y: curpos.y,
                        radius: 1
                    });
                    var canvasPosB = canvas.mapToCanvas({
                        x: x2,
                        y: y2,
                        radius: 1
                    });

                    var color = (!result.cell||result.cell.type==TYPE_EMPTY) ? 'green' : ((result.cell.type==TYPE_FOOD) ? 'blue' : 'red');
                    if( color != 'green')
                    canvas.drawLine2(canvasPosA.x, canvasPosA.y, canvasPosB.x, canvasPosB.y, 1, color);
                }
            }

            if( collisions.length )
                collisions.sort(function(a,b) {
                    return a.dist - b.dist;
                });

            var pct = 0.0;
            if( results.length )
                pct = open.length / results.length;

            return {pct:pct, open:open, collisions:collisions, results:results};
        },

        checkLineIntersection: function(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
            // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
            var denominator;
            var a;
            var b;
            var numerator1;
            var numerator2;
            var result = {
                    x: null,
                    y: null,
                    onLine1: false,
                    onLine2: false
                };
            denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
            if (denominator == 0) {
                return result;
            }
            a = line1StartY - line2StartY;
            b = line1StartX - line2StartX;
            numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
            numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
            a = numerator1 / denominator;
            b = numerator2 / denominator;

            // if we cast these lines infinitely in both directions, they intersect here:
            result.x = line1StartX + (a * (line1EndX - line1StartX));
            result.y = line1StartY + (a * (line1EndY - line1StartY));
            /*
            // it is worth noting that this should be the same as:
            x = line2StartX + (b * (line2EndX - line2StartX));
            y = line2StartX + (b * (line2EndY - line2StartY));
            */
            // if line1 is a segment and line2 is infinite, they intersect if:
            if (a > 0 && a < 1) {
                result.onLine1 = true;
            }
            // if line2 is a segment and line1 is infinite, they intersect if:
            if (b > 0 && b < 1) {
                result.onLine2 = true;
            }
            // if line1 and line2 are segments, they intersect if both of the above are true
            return result;
        }
    };
})();
/**
 * A 2d collision grid system for fast line to box collision
 *
 * - Flagged cells are occupied by object(s)
 * - Non-flagged cells are empty
 * - Cells are world space cut up into squares of X size
 */
var collisionGrid = (function() {
    collisionHelper.init();

    return {
        width: 0,
        height: 0,

        //clone for fast slicing
        grid: [],
        bgrid: [],
        cellSize: 20,
        halfCellSize: 10,
        startX: 0,
        startY: 0,
        gridWidth: 0,
        gridHeight: 0,
        endX: 0,
        endY: 0,
        astarGraph: 0,
        astarResult: 0,
        foodGroups: [],
        snakeAggressors: [],

        dirty: [],

        initGrid: function(w, h, cellsz) {
            sx = Math.floor(window.getX());
            sy = Math.floor(window.getY());
            sx = sx - (sx % cellsz);
            sy = sy - (sy % cellsz);

            collisionGrid.height = h * cellsz;
            collisionGrid.width = w * cellsz;
            collisionGrid.gridWidth = w;
            collisionGrid.gridHeight = h;
            collisionGrid.cellSize = cellsz;
            collisionGrid.halfCellSize = cellsz / 2;

            collisionGrid.startX = Math.floor(sx - ((w/2)*cellsz));
            collisionGrid.startY = Math.floor(sy - ((h/2)*cellsz));
            //collisionGrid.startX = collisionGrid.startX - (collisionGrid.startX % cellsz);
            //collisionGrid.startY = collisionGrid.startY - (collisionGrid.startY % cellsz);

            collisionGrid.endX = collisionGrid.startX + collisionGrid.width;
            collisionGrid.endY = collisionGrid.startY + collisionGrid.height;


            collisionGrid.booleanGrid = [];
            collisionGrid.grid = [];
            collisionGrid.foodGroups = [];
            collisionGrid.snakeAggressors = [];
            collisionGrid.addSnakes();
            collisionGrid.addFood();
        },

        setupGrid: function() {

        },

        // Slice out a portion of the grid for less calculations
        // callback = function(x, y, gridValue) {}
        sliceGrid: function(col, row, width, height, callback) {
            //constrain the values between 0 and width/height
            var col = Math.min(Math.max(col, 0), collisionGrid.gridWidth);
            var row = Math.min(Math.max(row, 0), collisionGrid.gridHeight);
            width = col + Math.min(collisionGrid.gridWidth, Math.max(width, 0));
            height = row + Math.min(collisionGrid.gridHeight, Math.max(height, 0));

            for(var x=col; x<width; x++) {
                for(var y=row; y<height; y++) {
                    collisionGrid.grid[x] = collisionGrid.grid[x] || [];
                    collisionGrid.grid[x][y] = collisionGrid.grid[x][y] || 0;
                    callback(x, y, collisionGrid.grid[x][y]);
                }
            }
        },

        // Find specific cell using map-space position
        getCellByXY: function(x, y) {
            //x = x;
           // y = y ;
            x = x - collisionGrid.startX;
            y = y - collisionGrid.startY;
            //x = x - (x % collisionGrid.cellSize);
           // y = y - (y % collisionGrid.cellSize);

            var col = parseInt(Math.floor(x / collisionGrid.cellSize));
            var row = parseInt(Math.floor(y / collisionGrid.cellSize));
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight);
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return {col:col, row:row, cell:collisionGrid.grid[col][row]};
        },

        // Get cell's map-space position at top left corner of cell
        getCellByColRow: function(col, row) {
            var x = collisionGrid.startX + (col*collisionGrid.cellSize) + collisionGrid.halfCellSize;
            var y = collisionGrid.startY + (row*collisionGrid.cellSize) + collisionGrid.halfCellSize;
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return {x:x, y:y, cell:collisionGrid.grid[col][row]};
        },

        // This is used to convert a width or height to the amount of cells it would occupy
        calculateMaxCellCount: function(sz) {
            return parseInt(Math.floor(sz / collisionGrid.cellSize));
        },

        // set cell size
        setCellSize: function(sz) {
            collisionGrid.cellSize = sz;
        },

        getCell: function(col,row) {
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            collisionGrid.grid[col][row] = collisionGrid.grid[col][row] || 0;
            return collisionGrid.grid[col][row];
        },

        cellTest: function(col, row, type) {
            cell = collisionGrid.getCell(col, row);  // first point
            if( cell && cell.type == type)
                return cell;
            if( !cell && type==TYPE_EMPTY)
                return collisionGrid.markCellEmpty(col,row);
            return false;
        },

        markCell: function(col, row, weight, type) {
            collisionGrid.grid[col] = collisionGrid.grid[col] || [];
            var node = collisionGrid.grid[col][row];
            if( !node || (type==TYPE_SNAKE && node.type!=TYPE_SNAKE)) {
                node = new GridNode(col, row, weight, type);
            }
            collisionGrid.grid[col][row] = node;
            return node;
        },

        markCellWall: function(col, row, obj) {
            var node = collisionGrid.markCell(col, row, 0, TYPE_SNAKE);
            node.items.push(obj);
            return node;
        },

        markCellEmpty: function(col, row, weight) {
            weight = weight || 1000;
            var node = collisionGrid.markCell(col, row, weight, TYPE_EMPTY);
            //node.items.push(obj);
            return node;
        },

        markCellFood: function(col, row, food) {
            var node = collisionGrid.markCell(col, row, -(food.sz*food.sz), TYPE_FOOD);
            node.items.push(food);
            return node;
        },

        isWall: function(col, row) {
            return collisionGrid.grid[col] && collisionGrid.grid[col][row] && collisionGrid.grid[col][row].type == TYPE_SNAKE;
        },

        isEmpty: function(col, row) {
            return collisionGrid.grid[col] && !collisionGrid.grid[col][row];
        },

        drawCell: function(col, row, color) {

            if( !window.visualDebugging )
                return;

            color = color || 'rgba(255,255,0,0.25)';
            var pos = collisionGrid.getCellByColRow(col, row);
            var canvasPos = canvas.mapToCanvas({
                x: pos.x-collisionGrid.halfCellSize,
                y: pos.y-collisionGrid.halfCellSize
            });

            canvas.drawRect(
                canvasPos.x,
                canvasPos.y,
                collisionGrid.cellSize * canvas.getScale(),
                collisionGrid.cellSize * canvas.getScale(),
                color);
        },

        addNeighbor: function(x, y, arr) {
            collisionGrid.grid[x] = collisionGrid.grid[x] || [];

            var node = collisionGrid.grid[x][y] || collisionGrid.markCellEmpty(x,y);;
            if( node.type == TYPE_SNAKE ) {
                return;
            }
            //if( !collisionGrid.grid[x][y] )


            arr.push(collisionGrid.grid[x][y]);
        },

        neighbors: function(x, y) {
            var ret = [];
            // West
            collisionGrid.addNeighbor(x-1, y, ret);
            //East
            collisionGrid.addNeighbor(x+1, y, ret);
            //South
            collisionGrid.addNeighbor(x, y-1, ret);
            //North
            collisionGrid.addNeighbor(x, y+1, ret);

            //if (this.diagonal) {
            // Southwest
            collisionGrid.addNeighbor(x-1, y-1, ret);
            // Southeast
            collisionGrid.addNeighbor(x+1, y-1, ret);
            // Northwest
            collisionGrid.addNeighbor(x-1, y+1, ret);
            // Northeast
            collisionGrid.addNeighbor(x+1, y+1, ret);
            //}

            return ret;
        },

        generatePath: function(startX, startY, endX, endY) {
            var startCell = collisionGrid.getCellByXY(startX,startY);
            var endCell = collisionGrid.getCellByXY(endX,endY);
            var start = collisionGrid.getCell(startCell.col, startCell.row) ||
                collisionGrid.markCellEmpty(startCell.col, startCell.row);
            var end = collisionGrid.getCell(endCell.col, endCell.row) ||
                collisionGrid.markCellEmpty(endCell.col, endCell.row);

            var path = astar.search(start, end);

            return path;
        },

        addFood: function() {

            collisionGrid.foodGroups = {};
            var curpos = window.getPos();
            var center = collisionGrid.getCellByXY(curpos.x,curpos.y);

            var foodGridSize = 10;
            var foodCellSize = 100;
            var foodCellSizeHalf = foodCellSize / 2;
            curpos.x = Math.floor(curpos.x);
            curpos.y = Math.floor(curpos.y);
            curpos.x = curpos.x - (curpos.x % foodCellSize);
            curpos.y = curpos.y - (curpos.y % foodCellSize);
            var startX = Math.floor(curpos.x - ((foodGridSize/2)*foodCellSize));
            var startY = Math.floor(curpos.y - ((foodGridSize/2)*foodCellSize));
            var endX = startX + foodGridSize * foodCellSize;
            var endY = startY + foodGridSize * foodCellSize;

            var foodGroupList = [];

            for(var i=0; i<window.foods.length; i++) {

                var food = window.foods[i];
                if( food === null || food === undefined )
                    continue;

                if( food.xx < startX ||
                    food.xx > endX ||
                    food.yy < startY ||
                    food.yy > endY )
                    continue;

                var x = food.xx - startX;
                var y = food.yy - startY;
                col = parseInt(Math.floor(x / foodCellSize));
                row = parseInt(Math.floor(y / foodCellSize));
                col = Math.min(Math.max(col, 0), foodGridSize);
                row = Math.min(Math.max(row, 0), foodGridSize);

/*
                var canvasPos = canvas.mapToCanvas({
                    x: startX + (col*foodCellSize),
                    y: startY + (row*foodCellSize)
                });

                canvas.drawRect(
                    canvasPos.x, canvasPos.y,
                    foodCellSize * canvas.getScale(),
                    foodCellSize * canvas.getScale(),
                    'rgba(0,255,0,0.25)');
*/
                var cell = collisionGrid.getCellByXY(food.xx, food.yy);
                var node = collisionGrid.markCellFood(cell.col, cell.row, food);
                if( node ) {
                    //var distance = astar.heuristics.diagonal({x:center.col,y:center.row},{x:cell.col, y:cell.row});//canvas.getDistance(food.xx, food.yy, curpos.x, curpos.y);
                    //distance = (distance + Math.abs(distance)) / 2;
                    var distance2 = canvas.getDistance2(food.xx, food.yy, curpos.x, curpos.y);
                    food.distance2 = distance2;
                    var id = col+','+row;
                    var groupid = collisionGrid.foodGroups[id]
                        || foodGroupList.length;
                    //collisionGrid.foodGroups[id] = collisionGrid.foodGroups[id]

                    var group = foodGroupList[groupid]
                        || {sumx:0, sumy:0, nodes:[], score:0, maxfood:0, distance2:-1};
                    group.nodes.push({x:food.xx, y:food.yy, distance2:distance2, node:node})
                    group.sumx += food.xx;
                    group.sumy += food.yy;
                    group.score += food.sz;
                    group.maxfood = food
                    if( !group.maxfood || food.sz > group.maxfood.sz ) {
                        group.maxfood = food.sz;
                    }
                    if( distance2 == -1 || distance2 < group.distance2 )
                        group.distance2 = distance2;
                    foodGroupList[groupid] = group;
                    collisionGrid.foodGroups[id] = groupid;
                }

            }


            //for( var key in collisionGrid.foodGroups) {
                //var score = collisionGrid.foodGroups[key].score;
                //collisionGrid.foodGroups[key].score = score*score;
            //    foodGroupList.push(collisionGrid.foodGroups[key]);
            //}

            foodGroupList.sort(function(a,b) {
                //return b.node.weight - a.node.weight;
                //var minimumDist = 500;
                //var adist = a.distance;// < minimumDist ? minimumDist : a.distance;
                //var bdist = b.distance;// < minimumDist ? minimumDist : b.distance;;
                //a.ratio = (a.score/a.distance);
                //b.ratio = (b.score/b.distance);
                return b.score - a.score;

                //return (a.score == b.score ? 0 : (a.score / a.distance) > (b.score / b.distance)  ? -1 : 1);
            });

            collisionGrid.foodGroups = foodGroupList;

        },

        // add all snake's collision parts to the grid
        addSnakes: function() {
            var myX = window.getX();
            var myY = window.getY();

            var lastAlive = 0;
            var deadCount = 0;
            var maxDeadCount = 2;
            for (var snakeid in window.snakes) {
                var snk = window.snakes[snakeid];
                if (snk.id == window.snake.id)
                    continue;
                var cnt = 0;

                snk.closest = 0;

                var relPos = {x:(myX-snk.xx), y:(myY-snk.yy)}
                var snakeDist = canvas.getDistance2(myX, myY, snk.xx, snk.yy);
                var rang = snk.ang * collisionHelper.toRad;
                collisionGrid.snakeAggressors.push({
                    snk:snk,
                    distance2:snakeDist,
                    relativePos:relPos,
                    heading:{x:Math.cos(rang),y:Math.sin(rang)}
                });

                if( snk.xx > collisionGrid.startX && snk.xx < collisionGrid.endX &&
                    snk.yy > collisionGrid.startY && snk.yy < collisionGrid.endY)
                    collisionGrid.snakePartBounds(snk,snk,2);

                for (var pts=snk.pts.length-1; pts>=0; pts--) {// in snk.pts) {
                    var part = snk.pts[pts];

                    if (part.dying) {
                        if( deadCount++ > maxDeadCount )
                            continue;
                    }


                    lastAlive = pts;
                    //only add parts that are within our grid bounds
                    if( part.xx < collisionGrid.startX || part.xx > collisionGrid.endX ||
                        part.yy < collisionGrid.startY || part.yy > collisionGrid.endY)
                        continue;


                    //canvas.drawText(canvas.mapToCanvas({x:part.xx, y:part.yy}), 'red', ''+pts);
                    collisionGrid.snakePartBounds(snk,part);
                }

                if( window.visualDebugging && snk.closest) {
                    canvas.drawCircle(canvas.circleMapToCanvas({x:snk.closest.xx, y:snk.closest.yy, radius:window.getSnakeWidth(snk.sc)}), 'orange', false);
                    canvas.drawCircle(canvas.circleMapToCanvas({x:snk.xx, y:snk.yy, radius:window.getSnakeWidth(snk.sc)}), 'red', false);
                }

            }


            collisionGrid.snakeAggressors.sort(function(a,b) {
                return a.distance2 - b.distance2;
            });
        },

        findClosestPart: function(snk, part) {
            var curpos = window.getPos();
            var dist2 = canvas.getDistance2(curpos.x, curpos.y, part.xx, part.yy);
            part.distance2 = dist2 - (window.getSnakeWidthSqr() + window.getSnakeWidthSqr(snk));
            if( snk.closest == 0 ) {
                snk.closest = part;
                return;
            }
            if( dist2 < snk.closest.distance2 ) {
                snk.closest = part;
            }
        },

        snakePartBounds: function(snk, part, sizemultiplier) {
            sizemultiplier = sizemultiplier || 1;

            collisionGrid.findClosestPart(snk,part);

            //calculate grid width/height of a snake part
            var cell = collisionGrid.getCellByXY(part.xx, part.yy);
            var radius = window.getSnakeWidth(snk.sc);
            radius = Math.max(radius, 20) *sizemultiplier;

            var threat1 = radius;
            var threat2 = radius * 1.5;
            var threat3 = radius * 2;
            var threat4 = radius * 3;
            var maxthreat = radius * 5;

            var t1cellcount = collisionGrid.calculateMaxCellCount(threat1);
            var t2cellcount = collisionGrid.calculateMaxCellCount(threat2);
            var t3cellcount = collisionGrid.calculateMaxCellCount(threat3);
            var t4cellcount = collisionGrid.calculateMaxCellCount(threat4);
            var maxcellcount = collisionGrid.calculateMaxCellCount(maxthreat);
            var maxcellcount2 = maxcellcount*2;
            //if( snk.sp > 7 && sizemultiplier >)
            //    radius = radius * 2;
            //var radiusSqr = radius*radius;
            //var cellcount = collisionGrid.calculateMaxCellCount(radius);
            //var cellcount2 = cellcount*3;


            //mark cell where part's center is located
            collisionGrid.markCellWall(cell.col, cell.row, {snake:snk, part:part});
            //canvas.drawCircle(canvas.mapToCanvas({x:part.xx, y:part.yy}), 'red', true);

            //mark surrounding cells using part's radius
            collisionGrid.sliceGrid(cell.col-maxcellcount, cell.row-maxcellcount, maxcellcount2, maxcellcount2,
                function(col, row, val) {
                    if( val && val.type != TYPE_SNAKE && val.type != TYPE_EMPTY ) return;//&& val.type!=TYPE_SNAKE ) return;
                    if( col >= (cell.col-t1cellcount) && col <= (cell.col+t1cellcount*2) &&
                        row >= (cell.row-t1cellcount) && row <= (cell.row+t1cellcount*2) ) {
                        var marked = collisionGrid.markCellWall(col, row, {snake:snk, part:part});
                    }
                    else if( col >= (cell.col-t2cellcount) && col <= (cell.col+t2cellcount*2) &&
                        row >= (cell.row-t2cellcount) && row <= (cell.row+t2cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,5000)
                    }
                    else if( col >= (cell.col-t3cellcount) && col <= (cell.col+t3cellcount*2) &&
                        row >= (cell.row-t3cellcount)&& row <= (cell.row+t3cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,3000)
                    }
                    else if( col >= (cell.col-t4cellcount) && col <= (cell.col+t4cellcount*2) &&
                        row >= (cell.row-t4cellcount)&& row <= (cell.row+t4cellcount*2) ) {
                        collisionGrid.markCellEmpty(col,row,2000)
                    }
                    else {
                        collisionGrid.markCellEmpty(col,row,1500)
                    }


                    //}
                    //else {
                    //    var marked = collisionGrid.markCellEmpty(col,row);
                    //    marked.weight = 10000;
                    //}
                }
            );
        },




        lineTestResult: 0,
        lineTypeCheck: function(col, row, type) {
            var cell = collisionGrid.cellTest(col, row, type);
            if( cell !== false )
                collisionGrid.lineTestResult = {col:col, row:row, cell:cell};
            return collisionGrid.lineTestResult;
        },
        lineTest: function(x1, y1, x2, y2, type) {
            collisionGrid.lineTestResult = 0;
            var posA = collisionGrid.getCellByXY(x1, y1);
            var posB = collisionGrid.getCellByXY(x2, y2);
            x1 = posA.col, x2 = posB.col;
            y1 = posA.row, y2 = posB.row;
            var i;               // loop counter
            var cell;
            var ystep, xstep;    // the step on y and x axis
            var error;           // the error accumulated during the increment
            var errorprev;       // *vision the previous value of the error variable
            var y = y1, x = x1;  // the line points
            var ddy, ddx;        // compulsory variables: the double values of dy and dx
            var dx = x2 - x1;
            var dy = y2 - y1;

            if( collisionGrid.lineTypeCheck(x1, y1, type) ) return collisionGrid.lineTestResult;

            // NB the last point can't be here, because of its previous point (which has to be verified)
            if (dy < 0) {
                ystep = -1;
                dy = -dy;
            }
            else
                ystep = 1;

            if (dx < 0) {
                xstep = -1;
                dx = -dx;
            }
            else
                xstep = 1;

            ddy = 2 * dy;  // work with double values for full precision
            ddx = 2 * dx;
            if (ddx >= ddy) {  // first octant (0 <= slope <= 1)
                // compulsory initialization (even for errorprev, needed when dx==dy)
                errorprev = error = dx;  // start in the middle of the square
                for (i=0 ; i < dx ; i++) {  // do not use the first point (already done)
                    x += xstep;
                    error += ddy;
                    if (error > ddx) {  // increment y if AFTER the middle ( > )
                        y += ystep;
                        error -= ddx;
                        // three cases (octant == right->right-top for directions below):
                        if (error + errorprev < ddx) {  // bottom square also
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                        else if (error + errorprev > ddx) { // left square also
                            //POINT (y, x-xstep);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};

                        }
                        else {  // corner: bottom and left squares also
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;

                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                            //POINT (y-ystep, x);
                            //POINT (y, x-xstep);
                        }
                    }
                    //POINT (y, x);
                    if( (cell = collisionGrid.cellTest(x, y,type)) !== false ) return {x:x, y:y, cell:cell};
                    errorprev = error;
                }
            }
            else {  // the same as above
                errorprev = error = dy;
                for (i=0 ; i < dy ; i++) {
                    y += ystep;
                    error += ddx;
                    if (error > ddy) {
                        x += xstep;
                        error -= ddy;
                        if (error + errorprev < ddy) {
                            //POINT (y, x-xstep);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                        }
                        else if (error + errorprev > ddy) {
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                        else {
                            //POINT (y, x-xstep);
                            //POINT (y-ystep, x);
                            if( collisionGrid.lineTypeCheck(x-xstep, y,type) ) return collisionGrid.lineTestResult;
                            if( collisionGrid.lineTypeCheck(x, y-ystep,type) ) return collisionGrid.lineTestResult;
                            //if( (cell = collisionGrid.cellTest(x-xstep, y)) !== false ) return {x:x-xstep, y:y, cell:cell};
                            //if( (cell = collisionGrid.cellTest(x, y-ystep)) !== false ) return {x:x, y:y-ystep, cell:cell};
                        }
                    }
                    //POINT (y, x);
                    if( collisionGrid.lineTypeCheck(x, y, type) ) return collisionGrid.lineTestResult;
                    //if( (cell = collisionGrid.cellTest(x, y)) !== false ) return {x:x, y:y, cell:cell};
                    errorprev = error;
                }
            }

            return {col:x, row:y, cell:0};
            // assert ((y == y2) && (x == x2));  // the last point (y2,x2) has to be the same with the last point of the algorithm
        }


    }
})();
