/*****************************************************************************
*
*  This file is part of the Melodique project. The project is
*  distributed at:
*  https://github.com/maximecb/Melodique
*
*  Copyright (c) 2013, Maxime Chevalier-Boisvert. All rights reserved.
*
*  This software is licensed under the following license (Modified BSD
*  License):
*
*  Redistribution and use in source and binary forms, with or without
*  modification, are permitted provided that the following conditions are
*  met:
*   1. Redistributions of source code must retain the above copyright
*      notice, this list of conditions and the following disclaimer.
*   2. Redistributions in binary form must reproduce the above copyright
*      notice, this list of conditions and the following disclaimer in the
*      documentation and/or other materials provided with the distribution.
*   3. The name of the author may not be used to endorse or promote
*      products derived from this software without specific prior written
*      permission.
*
*  THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESS OR IMPLIED
*  WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
*  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
*  NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
*  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
*  NOT LIMITED TO PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
*  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
*  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
*  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
*  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*
*****************************************************************************/

//============================================================================
// Page interface code
//============================================================================

/**
Called after page load to initialize needed resources
*/
function init()
{
    // Get a reference to the canvas
    canvas = findElementById("canvas");

    // Get a 2D context for the drawing canvas
    canvasCtx = canvas.getContext("2d");

    //console.log('Got page elements');

    // Set the canvas size
    canvas.width = 600;
    canvas.height = 350;

    // Create an audio context
    if (this.hasOwnProperty('AudioContext') === true)
    {
        //console.log('Audio context found');
        audioCtx = new AudioContext();
    }
    else if (this.hasOwnProperty('webkitAudioContext') === true)
    {
        //console.log('WebKit audio context found');
        audioCtx = new webkitAudioContext();
    }
    else
    {
        audioCtx = undefined;
    }

    // If an audio context was created
    if (audioCtx !== undefined)
    {
        // Get the sample rate for the audio context
        var sampleRate = audioCtx.sampleRate;

        console.log('Sample rate: ' + audioCtx.sampleRate);

        // Size of the audio generation buffer
        var bufferSize = 2048;
    }
    else
    {
        alert(
            'No Web Audio API support. Sound will be disabled. ' +
            'Try this page in the latest version of Chrome'
        );

        var sampleRate = 44100;
    }

    // Create a synthesis network
    var synthNet = new SynthNet(sampleRate);

    // Create a piece
    var piece = new Piece(synthNet);

    // Initialize the synth network
    initSynth(synthNet, piece);

    // Initialize the form
    initForm();   

    // Create an audio generation event handler
    var genAudio = piece.makeHandler();

    // JS audio node to produce audio output
    var jsAudioNode = undefined;

    // Drawing interval
    var drawInterv = undefined;

    drawTrack = function ()
    {
        drawMelody(canvas, canvasCtx, piece, piece.tracks[0]);
    }

    // Draw the empty track
    drawTrack();

    genMelody = function ()
    {
        makeMelody(piece);
    }

    playAudio = function ()
    {
        // If audio is disabled, stop
        if (audioCtx === undefined)
            return;

        // If the audio isn't stopped, stop it
        if (jsAudioNode !== undefined)
            stopAudio()

        // Set the playback time on the piece to 0 (start)
        piece.setTime(0);

        // Create a JS audio node and connect it to the destination
        jsAudioNode = audioCtx.createJavaScriptNode(bufferSize, 2, 2);
        jsAudioNode.onaudioprocess = genAudio;
	    jsAudioNode.connect(audioCtx.destination);

        drawInterv = setInterval(drawTrack, 100);
    }

    stopAudio = function ()
    {
        // If audio is disabled, stop
        if (audioCtx === undefined)
            return;

        if (jsAudioNode === undefined)
            return;

        // Notify the piece that we are stopping playback
        piece.stop();

        // Disconnect the audio node
        jsAudioNode.disconnect();
        jsAudioNode = undefined;

        // Clear the drawing interval
        clearInterval(drawInterv);
    }

    exportMIDI = function ()
    {
        var midiData = piece.getMIDIData(piece.tracks[0]);

        console.log('MIDI data length: ' + midiData.length);

        var base64Data = encodeBase64(midiData);

        console.log(base64Data);

        window.location = "data:audio/sp-midi;base64," + base64Data;
    }
}

// Attach the init function to the load event
if (window.addEventListener)
    window.addEventListener('load', init, false); 
else if (document.addEventListener)
    document.addEventListener('load', init, false); 
else if (window.attachEvent)
    window.attachEvent('onload', init); 

// Default console logging function implementation
if (!window.console) console = {};
console.log = console.log || function(){};
console.warn = console.warn || function(){};
console.error = console.error || function(){};
console.info = console.info || function(){};

// Check for typed array support
if (!this.Float64Array)
{
    console.log('No Float64Array support');
    Float64Array = Array;
}

