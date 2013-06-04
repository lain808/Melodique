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
@class Attack-Decay-Sustain-Release envelope implementation
*/
function ADSREnv(a, d, s, r)
{
    /**
    Attack time
    */
    this.a = a;

    /**
    Decay time
    */
    this.d = d;

    /**
    Sustain amplitude [0,1]
    */
    this.s = s;

    /**
    Release time
    */
    this.r = r;

    /**
    Attack curve exponent
    */
    this.aExp = 2;

    /**
    Decay curve exponent
    */
    this.dExp = 2;

    /**
    Release curve exponent
    */
    this.rExp = 2;
}

/**
Get the envelope value at a given time
*/
ADSREnv.prototype.getValue = function (curTime, onTime, offTime, onAmp, offAmp)
{
    // Interpolation function:
    // x ranges from 0 to 1
    function interp(x, yL, yR, exp)
    {
        // If the curve is increasing
        if (yR > yL)
        {
            return yL + Math.pow(x, exp) * (yR - yL);
        }
        else
        {
            return yR + Math.pow(1 - x, exp) * (yL - yR);
        }
    }

    if (offTime === 0)
    {
        var noteTime = curTime - onTime;

        if (noteTime < this.a)
        {
            return interp(noteTime / this.a, onAmp, 1, this.aExp);
        }
        else if (noteTime < this.a + this.d)
        {
            return interp((noteTime - this.a) / this.d , 1, this.s, this.dExp);
        }
        else
        {
            return this.s;
        }
    }
    else 
    {
        var relTime = curTime - offTime;

        if (relTime < this.r)
        {
            return interp(relTime / this.r, offAmp, 0, this.rExp);
        }
        else
        {
            return 0;
        }
    }
}

