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

/**
@class Simple virtual analog synthesizer
@extends SynthNode
*/
function VAnalog(numOscs)
{
    if (numOscs === undefined)
        numOscs = 1;

    /**
    Array of oscillator parameters
    */
    this.oscs = new Array(numOscs);

    // Initialize the oscillator parameters
    for (var i = 0; i < numOscs; ++i)
    {
        var osc = this.oscs[i] = {};

        // Oscillator type
        osc.type = 'sine';

        // Duty cycle, for pulse wave
        osc.duty = 0.5;

        // Oscillator detuning, in cents
        osc.detune = 0;

        // ADSR amplitude envelope
        osc.env = new ADSREnv(0.05, 0.05, 0.2, 0.1);

        // Mixing volume
        osc.volume = 1;

        // Oscillator sync flag
        osc.sync = false;

        // Syncing oscillator detuning
        osc.syncDetune = 0;
    }

    /**
    Filter cutoff [0,1]
    */
    this.cutoff = 1;

    /**
    Filter resonance [0,1]
    */
    this.resonance = 0;

    /**
    Filter envelope
    */
    this.filterEnv = new ADSREnv(0, 0, 1, Infinity);

    /**
    Filter envelope modulation amount
    */
    this.filterEnvAmt = 1;

    /**
    Active/on note array
    */
    this.actNotes = [];

    /**
    Temporary oscillator buffer, for intermediate processing
    */
    this.oscBuf = new Float64Array(SYNTH_BUF_SIZE);

    /**
    Temporary note buffer, for intermediate processing
    */
    this.noteBuf = new Float64Array(SYNTH_BUF_SIZE);

    // Sound output
    new SynthOutput(this, 'output');
}
VAnalog.prototype = new SynthNode();

/**
Process an event
*/
VAnalog.prototype.processEvent = function (evt, time)
{
    // Note-on event
    if (evt instanceof NoteOnEvt)
    {
        // Get the note
        var note = evt.note;

        // Try to find the note among the active list
        var noteState = undefined;
        for (var i = 0; i < this.actNotes.length; ++i)
        {
            var state = this.actNotes[i];

            if (state.note === note)
            {
                noteState = state;
                break;
            }
        }

        // If the note was not active before
        if (noteState === undefined)
        {
            noteState = {};

            // Note being played
            noteState.note = note;

            // Time a note-on was received
            noteState.onTime = time;

            // Time a note-off was received
            noteState.offTime = 0;

            // Initialize the oscillator states
            noteState.oscs = new Array(this.oscs.length);
            for (var i = 0; i < this.oscs.length; ++i)
            {
                var oscState = {};
                noteState.oscs[i] = oscState;

                // Cycle position
                oscState.cyclePos = 0;

                // Sync cycle position
                oscState.syncCyclePos = 0;

                // Envelope amplitude at note-on and note-off time
                oscState.onAmp = 0;
                oscState.offAmp = 0;
            }

            // Initialize the filter state values
            noteState.filterSt = new Array(8);
            for (var i = 0; i < noteState.filterSt.length; ++i)
                noteState.filterSt[i] = 0;

            // Filter envelope value at note-on and note-off time
            noteState.filterOnEnv = 0;
            noteState.filterOffEnv = 0;

            // Add the note to the active list
            this.actNotes.push(noteState);
        }

        // If the note was active before
        else
        {
            // Store the oscillator amplitudes at note-on time
            for (var i = 0; i < this.oscs.length; ++i)
            {
                var oscState = noteState.oscs[i];

                oscState.onAmp = this.oscs[i].env.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    oscState.onAmp,
                    oscState.offAmp
                );

                //console.log('on amp: ' + oscState.onAmp);
            }

            // Filter envelope value at note-on time
            noteState.filterOnEnv = this.filterEnv.getValue(
                time,
                noteState.onTime, 
                noteState.offTime,
                noteState.filterOnEnv,
                noteState.filterOffEnv
            );

            // Set the on and off times
            noteState.onTime = time;
            noteState.offTime = 0;
        }

        //console.log('on time: ' + noteState.onTime);
    }

    // Note-off event
    else if (evt instanceof NoteOffEvt)
    {
        // Get the note
        var note = evt.note;

        // Try to find the note among the active list
        var noteState = undefined;
        for (var i = 0; i < this.actNotes.length; ++i)
        {
            var state = this.actNotes[i];

            if (state.note === note)
            {
                noteState = state;
                break;
            }
        }

        // If the note is active
        if (noteState !== undefined)
        {
            // Store the oscillator amplitudes at note-off time
            for (var i = 0; i < this.oscs.length; ++i)
            {
                var oscState = noteState.oscs[i];

                oscState.offAmp = this.oscs[i].env.getValue(
                    time,
                    noteState.onTime, 
                    noteState.offTime,
                    oscState.onAmp,
                    oscState.offAmp
                );
            }

            // Filter envelope value at note-off time
            noteState.filterOffEnv = this.filterEnv.getValue(
                time,
                noteState.onTime, 
                noteState.offTime,
                noteState.filterOnEnv,
                noteState.filterOffEnv
            );

            // Set the note-off time
            noteState.offTime = time;
        }
    }

    // All notes off event
    else if (evt instanceof AllNotesOffEvt)
    {
        this.actNotes = [];
    }

    // By default, do nothing
}

/**
Update the outputs based on the inputs
*/
VAnalog.prototype.update = function (time, sampleRate)
{
    // If there are no active notes, do nothing
    if (this.actNotes.length === 0)
        return;

    // Get the output buffer
    var outBuf = this.output.getBuffer(0);

    // Initialize the output to 0
    for (var i = 0; i < outBuf.length; ++i)
        outBuf[i] = 0;

    // Get the time at the end of the buffer
    var endTime = time + ((outBuf.length - 1) / sampleRate);

    // For each active note
    for (var i = 0; i < this.actNotes.length; ++i)
    {
        var noteState = this.actNotes[i];

        // Initialize the note buffer to 0
        for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
            this.noteBuf[smpIdx] = 0;

        // Maximum end amplitude value
        var maxEndAmp = 0;

        // For each oscillator
        for (var oscNo = 0; oscNo < this.oscs.length; ++oscNo)
        {
            var oscParams = this.oscs[oscNo];
            var oscState = noteState.oscs[oscNo];

            // Generate the oscillator signal
            this.genOsc(
                this.oscBuf,
                oscParams,
                oscState,
                noteState.note, 
                sampleRate
            );

            // Get the amplitude value at the start of the buffer
            var ampStart = oscParams.volume * oscParams.env.getValue(
                time,
                noteState.onTime, 
                noteState.offTime,
                oscState.onAmp,
                oscState.offAmp
            );

            // Get the envelope value at the end of the buffer
            var ampEnd = oscParams.volume * oscParams.env.getValue(
                endTime,
                noteState.onTime, 
                noteState.offTime,
                oscState.onAmp,
                oscState.offAmp
            );

            //console.log('start time: ' + time);
            //console.log('start env: ' + envStart);
            //console.log('end: ' + envEnd);

            // Update the maximum end envelope value
            maxEndAmp = Math.max(maxEndAmp, ampEnd);

            // Modulate the output based on the amplitude envelope
            for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
            {
                var ratio = (smpIdx / (outBuf.length - 1));
                this.oscBuf[smpIdx] *= ampStart + ratio * (ampEnd - ampStart);
            }

            // Accumulate the sample values in the note buffer
            for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
                this.noteBuf[smpIdx] += this.oscBuf[smpIdx];
        }

        // Apply the filter to the temp buffer
        this.applyFilter(time, noteState, this.noteBuf);

        // Accumulate the sample values in the output buffer
        for (var smpIdx = 0; smpIdx < outBuf.length; ++smpIdx)
            outBuf[smpIdx] += this.noteBuf[smpIdx];

        // If all envelopes have fallen to 0, remove the note from the active list        
        if (maxEndAmp === 0)
        {
            this.actNotes.splice(i, 1);
            i--;
        }
    }
}

/**
Generate output for an oscillator and update its position
*/
VAnalog.prototype.genOsc = function (outBuf, oscParams, oscState, note, sampleRate)
{
    // Get the oscillator frequency
    var freq = note.getFreq(oscParams.detune);

    // Get the initial cycle position
    var cyclePos = oscState.cyclePos;

    // Compute the cycle position change between samples
    var deltaPos = freq / sampleRate;

    // Get the sync oscillator frequency
    var syncFreq = note.getFreq(oscParams.syncDetune);

    // Get the initial sync cycle position
    var syncCyclePos = oscState.syncCyclePos;

    // Compute the cycle position change between samples
    var syncDeltaPos = syncFreq / sampleRate;

    // For each sample to be produced
    for (var i = 0; i < outBuf.length; ++i)
    {
        // Switch on the oscillator type/waveform
        switch (oscParams.type)
        {
            // Sine wave        
            case 'sine':
            outBuf[i] = Math.sin(2 * Math.PI * cyclePos);
            break;

            // Triangle wave
            case 'triangle':
            if (cyclePos < 0.5)
                outBuf[i] = (4 * cyclePos) - 1;
            else
                outBuf[i] = 1 - (4 * (cyclePos - 0.5));
            break;

            // Sawtooth wave
            case 'sawtooth':
            outBuf[i] = -1 + (2 * cyclePos);
            break;

            // Pulse wave
            case 'pulse':
            if (cyclePos < oscParams.duty)
                outBuf[i] = -1;
            else
                outBuf[i] = 1;
            break;

            // Noise
            case 'noise':
            outBuf[i] = 1 - 2 * Math.random();
            break;

            default:
            error('invalid waveform: ' + oscParams.type);
        }

        cyclePos += deltaPos;

        if (cyclePos > 1) 
            cyclePos -= 1;

        if (oscParams.sync === true)
        {
            syncCyclePos += syncDeltaPos;

            if (syncCyclePos > 1)
            {
                syncCyclePos -= 1;
                cyclePos = 0;
            }
        }
    }

    // Set the final cycle position
    oscState.cyclePos = cyclePos;

    // Set the final sync cycle position
    oscState.syncCyclePos = syncCyclePos;
}

/**
Apply a filter to a buffer of samples
IIR, 2-pole, resonant Low Pass Filter (LPF)
*/
VAnalog.prototype.applyFilter = function (time, noteState, buffer)
{
    assert (
        this.cutoff >= 0 && this.cutoff <= 1,
        'invalid filter cutoff'
    );

    assert (
        this.resonance >= 0 && this.resonance <= 1,
        'invalid filter resonance'
    );

    var filterEnvVal = this.filterEnv.getValue(
        time,
        noteState.onTime, 
        noteState.offTime,
        noteState.filterOnEnv,
        noteState.filterOffEnv
    );

    var filterEnvMag = (1 - this.cutoff) * this.filterEnvAmt;

    var cutoff = this.cutoff + filterEnvMag * filterEnvVal;

    var c = Math.pow(0.5, (1 - cutoff) / 0.125);
    var r = Math.pow(0.5, (this.resonance + 0.125) / 0.125);

    var mrc = 1 - r * c;

    var v0 = noteState.filterSt[0];
    var v1 = noteState.filterSt[1];

    for (var i = 0; i < buffer.length; ++i)
    {
        v0 = (mrc * v0) - (c * v1) + (c * buffer[i]);
        v1 = (mrc * v1) + (c * v0);

        buffer[i] = v1;
    }

    noteState.filterSt[0] = v0;
    noteState.filterSt[1] = v1;
}

