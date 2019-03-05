/*
Copyright 2011-14 Newcastle University
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
/** @file Mathematical functions, providing stuff that the built-in `Math` object doesn't, as well as vector and matrix math operations.
 *
 * Provides {@link Numbas.math}, {@link Numbas.vectormath} and {@link Numbas.matrixmath}
 */
Numbas.queueScript('math',['base','decimal'],function() {
    
    Decimal.set({ 
        precision: 40,
        modulo: Decimal.EUCLID 
    });

/** Mathematical functions, providing stuff that the built-in `Math` object doesn't
 * @namespace Numbas.math */
/** A complex number.
 * @typedef complex
 * @property {Number} re
 * @property {Number} im
 */
/** @typedef range
 * @desc A range of numbers, separated by a constant interval and between fixed lower and upper bounds.
 * @type {Array.<Number>}
 * @property {Number} 0 Minimum value
 * @property {Number} 1 Maximum value
 * @property {Number} 2 Step size
 * @see Numbas.math.defineRange
 */
var math = Numbas.math = /** @lends Numbas.math */ {
    /** Regex to match numbers in scientific notation 
     * @type {RegExp}
     * @memberof Numbas.math
     */
    re_scientificNumber: /(\-?(?:0|[1-9]\d*)(?:\.\d+)?)[eE]([\+\-]?\d+)/,
    /** Construct a complex number from real and imaginary parts.
     *
     * Elsewhere in this documentation, `{Number}` will refer to either a JavaScript float or a {@link complex} object, interchangeably.
     * @param {Number} re
     * @param {Number} im
     * @returns {complex}
     */
    complex: function(re,im)
    {
        if(!im)
            return re;
        else
            return {re: re, im: im, complex: true,
            toString: math.complexToString}
    },
    /** String version of a complex number
     * @see Numbas.math.niceNumber
     * @method
     * @returns {String}
     */
    complexToString: function()
    {
        return math.niceNumber(this);
    },
    /** Negate a number.
     * @param {Number} n
     * @returns {Number}
     */
    negate: function(n)
    {
        if(n.complex)
            return math.complex(-n.re,-n.im);
        else
            return -n;
    },
    /** Complex conjugate
     * @param {Number} n
     * @returns {Number}
     */
    conjugate: function(n)
    {
        if(n.complex)
            return math.complex(n.re,-n.im);
        else
            return n;
    },
    /** Add two numbers
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    add: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re+b.re, a.im + b.im);
            else
                return math.complex(a.re+b, a.im);
        }
        else
        {
            if(b.complex)
                return math.complex(a + b.re, b.im);
            else
                return a+b;
        }
    },
    /** Subtract one number from another
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    sub: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re-b.re, a.im - b.im);
            else
                return math.complex(a.re-b, a.im);
        }
        else
        {
            if(b.complex)
                return math.complex(a - b.re, -b.im);
            else
                return a-b;
        }
    },
    /** Multiply two numbers
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    mul: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
                return math.complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
            else
                return math.complex(a.re*b, a.im*b);
        }
        else
        {
            if(b.complex)
                return math.complex(a*b.re, a*b.im);
            else
                return a*b;
        }
    },
    /** Divide one number by another
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    div: function(a,b)
    {
        if(a.complex)
        {
            if(b.complex)
            {
                var q = b.re*b.re + b.im*b.im;
                return math.complex((a.re*b.re + a.im*b.im)/q, (a.im*b.re - a.re*b.im)/q);
            }
            else
                return math.complex(a.re/b, a.im/b);
        }
        else
        {
            if(b.complex)
            {
                var q = b.re*b.re + b.im*b.im;
                return math.complex(a*b.re/q, -a*b.im/q);
            }
            else
                return a/b;
        }
    },
    /** Exponentiate a number
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    pow: function(a,b)
    {
        if(a.complex && Numbas.util.isInt(b) && Math.abs(b)<100)
        {
            if(b<0)
                return math.div(1,math.pow(a,-b));
            if(b==0)
                return 1;
            var coeffs = math.binomialCoefficients(b);
            var re = 0;
            var im = 0;
            var sign = 1;
            for(var i=0;i<b;i+=2) {
                re += coeffs[i]*Math.pow(a.re,b-i)*Math.pow(a.im,i)*sign;
                im += coeffs[i+1]*Math.pow(a.re,b-i-1)*Math.pow(a.im,i+1)*sign;
                sign = -sign;
            }
            if(b%2==0)
                re += Math.pow(a.im,b)*sign;
            return math.complex(re,im);
        }
        if(a.complex || b.complex || (a<0 && math.fract(b)!=0))
        {
            if(!a.complex)
                a = {re: a, im: 0, complex: true};
            if(!b.complex)
                b = {re: b, im: 0, complex: true};
            var ss = a.re*a.re + a.im*a.im;
            var arg1 = math.arg(a);
            var mag = Math.pow(ss,b.re/2) * Math.exp(-b.im*arg1);
            var arg = b.re*arg1 + (b.im * Math.log(ss))/2;
            return math.complex(mag*Math.cos(arg), mag*Math.sin(arg));
        }
        else
        {
            return Math.pow(a,b);
        }
    },
    /** Calculate the Nth row of Pascal's triangle
     * @param {Number} n
     * @returns {Array.<Number>}
     */
    binomialCoefficients: function(n) {
        var b = [1];
        var f = 1;
        for(var i=1;i<=n;i++) {
            b.push( f*=(n+1-i)/i );
        }
        return b;
    },
    /** a mod b. Always returns a positive number
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    mod: function(a,b) {
        if(b==Infinity) {
            return a;
        }
        b = math.abs(b);
        return ((a%b)+b)%b;
    },
    /** Calculate the `b`-th root of `a`
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    root: function(a,b)
    {
        return math.pow(a,div(1,b));
    },
    /** Square root
     * @param {Number} n
     * @returns {Number}
     */
    sqrt: function(n)
    {
        if(n.complex)
        {
            var r = math.abs(n);
            return math.complex( Math.sqrt((r+n.re)/2), (n.im<0 ? -1 : 1) * Math.sqrt((r-n.re)/2));
        }
        else if(n<0)
            return math.complex(0,Math.sqrt(-n));
        else
            return Math.sqrt(n)
    },
    /** Natural logarithm (base `e`)
     * @param {Number} n
     * @returns {Number}
     */
    log: function(n)
    {
        if(n.complex)
        {
            var mag = math.abs(n);
            var arg = math.arg(n);
            return math.complex(Math.log(mag), arg);
        }
        else if(n<0)
            return math.complex(Math.log(-n),Math.PI);
        else
            return Math.log(n);
    },
    /** Calculate `e^n`
     * @param {Number} n
     * @returns {Number}
     */
    exp: function(n)
    {
        if(n.complex)
        {
            return math.complex( Math.exp(n.re) * Math.cos(n.im), Math.exp(n.re) * Math.sin(n.im) );
        }
        else
            return Math.exp(n);
    },
    /** Magnitude of a number - absolute value of a real; modulus of a complex number.
     * @param {Number} n
     * @returns {Number}
     */
    abs: function(n)
    {
        if(n.complex)
        {
            if(n.re==0)
                return Math.abs(n.im);
            else if(n.im==0)
                return Math.abs(n.re);
            else
                return Math.sqrt(n.re*n.re + n.im*n.im)
        }
        else
            return Math.abs(n);
    },
    /** Argument of a (complex) number
     * @param {Number} n
     * @returns {Number}
     */
    arg: function(n)
    {
        if(n.complex)
            return Math.atan2(n.im,n.re);
        else
            return Math.atan2(0,n);
    },
    /** Real part of a number
     * @param {Number} n
     * @returns {Number}
     */
    re: function(n)
    {
        if(n.complex)
            return n.re;
        else
            return n;
    },
    /** Imaginary part of a number
     * @param {Number} n
     * @returns {Number}
     */
    im: function(n)
    {
        if(n.complex)
            return n.im;
        else
            return 0;
    },
    /** Is `n` positive? (Real, and greater than 0)
     * @param {Number} n
     * @returns {Boolean}
     */
    positive: function(n) {
        return !n.complex && math.gt(n,0);
    },
    /** Is `n` negative? (Real, and less than 0)
     * @param {Number} n
     * @returns {Boolean}
     */
    negative: function(n) {
        return math.lt(math.re(n),0);
    },
    /** Is `n` nonnegative? (Real, and greater than or equal to 0)
     * @param {Number} n
     * @returns {Boolean}
     */
    nonnegative: function(n) {
        return !math.negative(n);
    },
    /** Is `a` less than `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    lt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return !math.geq(a,b);
    },
    /** Is `a` greater than `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    gt: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return !math.leq(a,b);
    },
    /** Is `a` less than or equal to `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    leq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a<b || math.eq(a,b);
    },
    /** Is `a` greater than or equal to `b`?
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    geq: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return a>b || math.eq(a,b);
    },
    /** Is `a` equal to `b`?
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        if(a.complex) {
            if(b.complex) {
                return math.eq(a.re,b.re) && math.eq(a.im,b.im);
            } else {
                return math.eq(a.re,b) && math.eq(a.im,0);
            }
        } else {
            if(b.complex) {
                return math.eq(a,b.re) && math.eq(b.im,0);
            } else {
                if(isNaN(a)) {
                    return isNaN(b);
                }
                return a==b || math.isclose(a,b);
            }
        }
    },

    /** Is `a` close to `b`?
     * @param {Number} a
     * @param {Number} b
     * @param {Number} [rel_tol=1e-12] - relative tolerance: amount of error relative to `max(abs(a),abs(b))`.
     * @param {Number} [abs_tol=0] - absolute tolerance: maximum absolute difference between `a` and `b`.
     * @returns {Boolean}
     */
    isclose: function(a,b,rel_tol,abs_tol) {
        rel_tol = rel_tol===undefined ? 1e-15 : rel_tol;
        abs_tol = abs_tol===undefined ? 0 : rel_tol;
        return Math.abs(a-b) <= Math.max( rel_tol * Math.max(Math.abs(a), Math.abs(b)), abs_tol );
    },

    /** Greatest of two numbers - wraps `Math.max`
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    max: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.max(a,b);
    },
    /** Greatest of a list of numbers
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {Number}
     */
    listmax: function(numbers) {
        if(numbers.length==0) {
            return;
        }
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = math.max(best,numbers[i]);
        }
        return best;
    },
    /** Least of two numbers - wraps `Math.min`
     * @throws {Numbas.Error} `math.order complex numbers` if `a` or `b` are complex numbers.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    min: function(a,b)
    {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.order complex numbers'));
        return Math.min(a,b);
    },
    /** Least of a list of numbers
     * @throws {Numbas.Error} `math.order complex numbers` if any element of the list is complex.
     * @param {Array} numbers
     * @returns {Number}
     */
    listmin: function(numbers) {
        if(numbers.length==0) {
            return;
        }
        var best = numbers[0];
        for(var i=1;i<numbers.length;i++) {
            best = math.min(best,numbers[i]);
        }
        return best;
    },
    /** Are `a` and `b` unequal?
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     * @see Numbas.math.eq
     */
    neq: function(a,b)
    {
        return !math.eq(a,b);
    },
    /** If `n` can be written in the form `a*pi^n`, return the biggest possible `n`, otherwise return `0`.
     * @param {Number} n
     * @returns {Number}
     */
    piDegree: function(n)
    {
        n=Math.abs(n);
        if(n>10000)    //so big numbers don't get rounded to a power of pi accidentally
            return 0;
        var degree,a;
        for(degree=1; (a=n/Math.pow(Math.PI,degree))>1 && Math.abs(a-math.round(a))>0.00000001; degree++) {}
        return( a>=1 ? degree : 0 );
    },
    /** Add the given number of zero digits to a string representation of a number.
     * @param {String} n - a string representation of a number
     * @param {Number} digits - the number of digits to add
     * @returns {String}
     */
    addDigits: function(n,digits) {
        n = n+'';
        var m = n.match(/^(-?\d+(?:\.\d+)?)(e[\-+]?\d+)$/);
        if(m) {
            return math.addDigits(m[1],digits)+m[2];
        } else {
            if(n.indexOf('.')==-1) {
                n += '.';
            }
            for(var i=0;i<digits;i++) {
                n += '0';
            }
            return n;
        }
    },
    /** Settings for {@link Numbas.math.niceNumber}
     * @typedef Numbas.math.niceNumber_settings
     * @property {String} precisionType - Either `"dp"` or `"sigfig"`.
     * @property {Number} precision - number of decimal places or significant figures to show.
     * @property {String} style - Name of a notational style to use. See {@link Numbas.util.numberNotationStyles}.
     */
    /** Display a number nicely - rounds off to 10dp so floating point errors aren't displayed
     * @param {Number} n
     * @param {Numbas.math.niceNumber_settings} options - `precisionType` is either "dp" or "sigfig". `style` is an optional notation style to use.
     * @see Numbas.util.numberNotationStyles
     * @returns {String}
     */
    niceNumber: function(n,options)
    {
        options = options || {};
        if(n===undefined) {
            throw(new Numbas.Error('math.niceNumber.undefined'));
        }
        if(n.complex)
        {
            var re = math.niceNumber(n.re,options);
            var im = math.niceNumber(n.im,options);
            if(math.precround(n.im,10)==0)
                return re+'';
            else if(math.precround(n.re,10)==0)
            {
                if(n.im==1)
                    return 'i';
                else if(n.im==-1)
                    return '-i';
                else
                    return im+'*i';
            }
            else if(n.im<0)
            {
                if(n.im==-1)
                    return re+' - i';
                else
                    return re+im+'*i';
            }
            else
            {
                if(n.im==1)
                    return re+' + '+'i';
                else
                    return re+' + '+im+'*i';
            }
        }
        else
        {
            if(n==Infinity) {
                return 'infinity';
            } else if(n==-Infinity) {
                return '-infinity';
            }
            var piD = 0;
            if(options.precisionType === undefined && (piD = math.piDegree(n)) > 0)
                n /= Math.pow(Math.PI,piD);
            var out;
            if(options.style=='scientific') {
                var s = n.toExponential();
                var bits = math.parseScientific(s);
                var noptions = {precisionType: options.precisionType, precision: options.precision, style: 'si-en'};
                var significand = math.niceNumber(bits.significand,noptions);
                var exponent = bits.exponent;
                if(exponent>=0) {
                    exponent = '+'+exponent;
                }
                return significand+'e'+exponent;
            } else {
                switch(options.precisionType) {
                case 'sigfig':
                    var precision = options.precision;
                    out = math.siground(n,precision)+'';
                    var sigFigs = math.countSigFigs(out,true);
                    if(sigFigs<precision) {
                        out = math.addDigits(out,precision-sigFigs);
                    }
                    break;
                case 'dp':
                    var precision = options.precision;
                    out = math.precround(n,precision)+'';
                    var dp = math.countDP(out);
                    if(dp<precision) {
                        out = math.addDigits(out,precision-dp);
                    }
                    break;
                default:
                    var a = Math.abs(n);
                    if(a<1e-15) {
                        out = '0';
                    } else if(Math.abs(n)<1e-8) {
                        out = n+'';
                    } else {
                        out = math.precround(n,10)+'';
                    }
                }
                out = math.unscientific(out);
                if(options.style && Numbas.util.numberNotationStyles[options.style]) {
                    var match_neg = /^(-)?(.*)/.exec(out);
                    var minus = match_neg[1] || '';
                    var bits = match_neg[2].split('.');
                    var integer = bits[0];
                    var decimal = bits[1];
                    out = minus+Numbas.util.numberNotationStyles[options.style].format(integer,decimal);
                }
            }
            switch(piD)
            {
            case 0:
                return out;
            case 1:
                if(n==1)
                    return 'pi';
                else if(n==-1)
                    return '-pi';
                else
                    return out+'*pi';
            default:
                if(n==1)
                    return 'pi^'+piD;
                else if(n==-1)
                    return '-pi^'+piD;
                else
                    return out+'*pi'+piD;
            }
        }
    },
    /** Get a random number in range `[0..n-1]`
     * @param {Number} n
     * @returns {Number}
     */
    randomint: function(n) {
        return Math.floor(n*(Math.random()%1));
    },
    /** Get a  random shuffling of the numbers `[0..n-1]`
     * @param {Number} N
     * @returns {Array.<Number>}
     */
    deal: function(N)
    {
        var J, K, Q = new Array(N);
        for (J=0 ; J<N ; J++)
            { K = math.randomint(J+1) ; Q[J] = Q[K] ; Q[K] = J; }
        return Q;
    },
    /** Randomly shuffle a list. Returns a new list - the original is unmodified.
     * @param {Array} list
     * @returns {Array}
     */
    shuffle: function(list) {
        var l = list.length;
        var permutation = math.deal(l);
        var list2 = new Array(l);
        for(var i=0;i<l;i++) {
            list2[i]=(list[permutation[i]]);
        }
        return list2;
    },
    /** Calculate the inverse of a shuffling
     * @param {Array.<Number>} l
     * @returns {Array.<Number>} l
     * @see Numbas.math.deal
     */
    inverse: function(l)
    {
        arr = new Array(l.length);
        for(var i=0;i<l.length;i++)
        {
            arr[l[i]]=i;
        }
        return arr;
    },
    /* Just the numbers from 1 to `n` (inclusive) in an array!
     * @param {Number} n
     * @returns {Array.<Number>}
     */
    range: function(n)
    {
        var arr=new Array(n);
        for(var i=0;i<n;i++)
        {
            arr[i]=i;
        }
        return arr;
    },
    /** Round `a` to `b` decimal places. Real and imaginary parts of complex numbers are rounded independently.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex
     */
    precround: function(a,b) {
        if(b.complex)
            throw(new Numbas.Error('math.precround.complex'));
        if(a.complex)
            return math.complex(math.precround(a.re,b),math.precround(a.im,b));
        else
        {
            var be = Math.pow(10,b);
            var fracPart = a % 1;
            var intPart = a - fracPart;
            //test to allow a bit of leeway to account for floating point errors
            //if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
            var v = fracPart*be*10 % 1;
            var d = (fracPart>0 ? Math.floor : Math.ceil)(fracPart*be*10 % 10);
            // multiply fractional part by 10^b; we'll throw away the remaining fractional part (stuff < 10^b)
            fracPart *= be;
            if( (d==4 && 1-v<1e-9) || (d==-5 && v>-1e-9 && v<0)) {
                fracPart += 1;
            }
            var rounded_fracPart = Math.round(fracPart);
            // if the fractional part has rounded up to a whole number, just add sgn(fracPart) to the integer part
            if(rounded_fracPart==be || rounded_fracPart==-be) {
                return intPart+math.sign(fracPart);
            }
            // get the fractional part as a string of decimal digits
            var fracPartString = Math.round(Math.abs(fracPart))+'';
            while(fracPartString.length<b) {
                fracPartString = '0'+fracPartString;
            }
            // construct the rounded number as a string, then convert it to a JS float
            var out = parseFloat(intPart+'.'+fracPartString);
            // make sure a negative number remains negative
            if(intPart==0 && a<0) {
                return -out;
            } else {
                return out;
            }
        }
    },

    /** Get the significand and exponent of a number written in exponential form
     * @param {String} str
     * @returns {{significand: Number, exponent: Number}}
     */
    parseScientific: function(str) {
        var m = /(-?\d[ \d]*(?:\.\d[ \d]*)?)e([\-+]?\d[ \d]*)/i.exec(str);
        return {significand: parseFloat(m[1].replace(' ','')), exponent: parseInt(m[2].replace(' ',''))};
    },

    /** If the given string is scientific notation representing a number, return a string of the form \d+\.\d+
     * For example, '1.23e-5' is returned as '0.0000123'
     * @param {String} str
     * @returns {String}
     */
    unscientific: function(str) {
        var m = /(-)?([ \d]+)(?:\.([ \d]+))?e([\-+]?[\d ]+)/i.exec(str);
        if(!m) {
            return str;
        }
        var minus = m[1] || '';
        var digits = (m[2]+(m[3] || '')).replace(' ','');
        var pow = parseInt(m[4].replace(' ',''));
        var l = digits.length;
        var out;
        if(pow>=l-1) {
            out = digits;
            for(var i=l-1;i<pow;i++) {
                out += '0';
            }
        } else if(pow<0) {
            out = digits;
            for(var i=1;i<-pow;i++) {
                out = '0'+out;
            }
            out = '0.'+out;
        } else {
            out = digits.slice(0,pow+1) + '.' + digits.slice(pow+1);
        }
        return minus + out;
    },
    /** Round `a` to `b` significant figures. Real and imaginary parts of complex numbers are rounded independently.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.precround.complex" if b is complex
     */
    siground: function(a,b) {
        if(b.complex) {
            throw(new Numbas.Error('math.siground.complex'));
        }
        if(a.complex) {
            return math.complex(math.siground(a.re,b),math.siground(a.im,b));
        } else {
            var s = math.sign(a);
            if(a==0) { return 0; }
            if(a==Infinity || a==-Infinity) { return a; }
            var bp = Math.pow(10, b-Math.ceil(math.log10(s*a)));
            var ibp = Math.pow(10, Math.ceil(math.log10(s*a))-b);
            //test to allow a bit of leeway to account for floating point errors
            //if a*10^b is less than 1e-9 away from having a five as the last digit of its whole part, round it up anyway
            var v = a*bp*10 % 1;
            var d = (a>0 ? Math.floor : Math.ceil)(a*bp*10 % 10);
            var out = a*bp;
            if(d==4 && 1-v<1e-9) {
                out += 1;
            } else if(d==-5 && v>-1e-9 && v<0) {
                out += 1;
            }
            return Math.round(out)*ibp;
        }
    },
    /** Count the number of decimal places used in the string representation of a number.
     * @param {Number|String} n
     * @returns {Number}
     */
    countDP: function(n) {
        var m = (n+'').match(/(?:\.(\d*))?(?:[Ee]([\-+])?(\d+))?$/);
        if(!m)
            return 0;
        else {
            var dp = m[1] ? m[1].length : 0;
            if(m[2] && m[2]=='-') {
                dp += parseInt(m[3]);
            }
            return dp;
        }
    },
    /** Calculate the significant figures precision of a number.
     * @param {Number|String} n
     * @param {Boolean} [max] - be generous with calculating sig. figs. for whole numbers. e.g. '1000' could be written to 4 sig figs.
     * @returns {Number}
     */
    countSigFigs: function(n,max) {
        n += '';
        var m;
        if(max) {
            m = n.match(/^-?(?:(\d0*)$|(?:([1-9]\d*[1-9]0*)$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)[Ee][+\-]?\d+)$)/i);
        } else {
            m = n.match(/^-?(?:(\d)0*$|(?:([1-9]\d*[1-9])0*$)|([1-9]\d*\.\d+$)|(0\.0+$)|(?:0\.0*([1-9]\d*))|(?:(\d*(?:\.\d+)?)[Ee][+\-]?\d+)$)/i);
        }
        if(!m)
            return 0;
        var sigFigs = m[1] || m[2] || m[3] || m[4] || m[5] || m[6];
        return sigFigs.replace('.','').length;
    },
    /** Is n given to the desired precision?
     * @param {Number|String} n
     * @param {String} precisionType - either 'dp' or 'sigfig'
     * @param {Number} precision - number of desired digits of precision
     * @param {Boolean} strictPrecision - must trailing zeros be used to get to the desired precision (true), or is it allowed to give fewer digits in that case (false)?
     * @returns {Boolean}
     */
    toGivenPrecision: function(n,precisionType,precision,strictPrecision) {
        if(precisionType=='none') {
            return true;
        }
        n += '';
        var precisionOK = false;
        var counters = {'dp': math.countDP, 'sigfig': math.countSigFigs};
        var counter = counters[precisionType];
        var digits = counter(n);
        if(strictPrecision)
            precisionOK = digits == precision;
        else
            precisionOK = digits <= precision;
        if(precisionType=='sigfig' && !precisionOK && digits < precision && /[1-9]\d*0+$/.test(n)) {    // in cases like 2070, which could be to either 3 or 4 sig figs
            var trailingZeroes = n.match(/0*$/)[0].length;
            if(digits + trailingZeroes >= precision) {
                precisionOK = true;
            }
        }
        return precisionOK;
    },
    /** Is a within +/- tolerance of b?
     * @param {Number} a
     * @param {Number} b
     * @param {Number} tolerance
     * @returns {Boolean}
     */
    withinTolerance: function(a,b,tolerance) {
        if(tolerance==0) {
            return math.eq(a,b);
        } else {
            var upper = math.add(b,tolerance);
            var lower = math.sub(b,tolerance);
            return math.geq(a,lower) && math.leq(a,upper);
        }
    },
    /** Factorial, or Gamma(n+1) if n is not a positive integer.
     * @param {Number} n
     * @returns {Number}
     */
    factorial: function(n)
    {
        if( Numbas.util.isInt(n) && n>=0 )
        {
            if(n<=1) {
                return 1;
            }else{
                var j=1;
                for(var i=2;i<=n;i++)
                {
                    j*=i;
                }
                return j;
            }
        }
        else    //gamma function extends factorial to non-ints and negative numbers
        {
            return math.gamma(math.add(n,1));
        }
    },
    /** Lanczos approximation to the gamma function
     *
     * http://en.wikipedia.org/wiki/Lanczos_approximation#Simple_implementation
     * @param {Number} n
     * @returns {Number}
     */
    gamma: function(n)
    {
        var g = 7;
        var p = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
        var mul = math.mul, div = math.div, exp = math.exp, neg = math.negate, pow = math.pow, sqrt = math.sqrt, sin = math.sin, add = math.add, sub = math.sub, pi = Math.PI, im = math.complex(0,1);
        if((n.complex && n.re<0.5) || (!n.complex && n<0.5))
        {
            return div(pi,mul(sin(mul(pi,n)),math.gamma(sub(1,n))));
        }
        else
        {
            n = sub(n,1);            //n -= 1
            var x = p[0];
            for(var i=1;i<g+2;i++)
            {
                x = add(x, div(p[i],add(n,i)));    // x += p[i]/(n+i)
            }
            var t = add(n,add(g,0.5));        // t = n+g+0.5
            return mul(sqrt(2*pi),mul(pow(t,add(n,0.5)),mul(exp(neg(t)),x)));    // return sqrt(2*pi)*t^(z+0.5)*exp(-t)*x
        }
    },
    /** Base-10 logarithm
     * @param {Number} n
     * @returns {Number}
     */
    log10: function(n)
    {
        return mul(math.log(n),Math.LOG10E);
    },
    /** Arbitrary base logarithm
     * @param {Number} n
     * @param {Number} b
     * @returns {Number} log(n)/log(b)
     */
    log_base: function(n,b)
    {
        return div(math.log(n),math.log(b));
    },
    /** Convert from degrees to radians
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.degrees
     */
    radians: function(x) {
        return mul(x,Math.PI/180);
    },
    /** Convert from radians to degrees
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.radians
     */
    degrees: function(x) {
        return mul(x,180/Math.PI);
    },
    /** Cosine
     * @param {Number} x
     * @returns {Number}
     */
    cos: function(x) {
        if(x.complex)
        {
            return math.complex(Math.cos(x.re)*math.cosh(x.im), -Math.sin(x.re)*math.sinh(x.im));
        }
        else
            return Math.cos(x);
    },
    /** Sine
     * @param {Number} x
     * @returns {Number}
     */
    sin: function(x) {
        if(x.complex)
        {
            return math.complex(Math.sin(x.re)*math.cosh(x.im), Math.cos(x.re)*math.sinh(x.im));
        }
        else
            return Math.sin(x);
    },
    /** Tangent
     * @param {Number} x
     * @returns {Number}
     */
    tan: function(x) {
        if(x.complex)
            return div(math.sin(x),math.cos(x));
        else
            return Math.tan(x);
    },
    /** Cosecant
     * @param {Number} x
     * @returns {Number}
     */
    cosec: function(x) {
        return div(1,math.sin(x));
    },
    /** Secant
     * @param {Number} x
     * @returns {Number}
     */
    sec: function(x) {
        return div(1,math.cos(x));
    },
    /** Cotangent
     * @param {Number} x
     * @returns {Number}
     */
    cot: function(x) {
        return div(1,math.tan(x));
    },
    /** Inverse sine
     * @param {Number} x
     * @returns {Number}
     */
    arcsin: function(x) {
        if(x.complex || math.abs(x)>1)
        {
            var i = math.complex(0,1), ni = math.complex(0,-1);
            var ex = add(mul(x,i),math.sqrt(sub(1,mul(x,x)))); //ix+sqrt(1-x^2)
            return mul(ni,math.log(ex));
        }
        else
            return Math.asin(x);
    },
    /** Inverse cosine
     * @param {Number} x
     * @returns {Number}
     */
    arccos: function(x) {
        if(x.complex || math.abs(x)>1)
        {
            var i = math.complex(0,1), ni = math.complex(0,-1);
            var ex = add(x, math.sqrt( sub(mul(x,x),1) ) );    //x+sqrt(x^2-1)
            var result = mul(ni,math.log(ex));
            if(math.re(result)<0 || math.re(result)==0 && math.im(result)<0)
                result = math.negate(result);
            return result;
        }
        else
            return Math.acos(x);
    },
    /** Inverse tangent
     * @param {Number} x
     * @returns {Number}
     */
    arctan: function(x) {
        if(x.complex)
        {
            var i = math.complex(0,1);
            var ex = div(add(i,x),sub(i,x));
            return mul(math.complex(0,0.5), math.log(ex));
        }
        else
            return Math.atan(x);
    },
    /** Hyperbolic sine
     * @param {Number} x
     * @returns {Number}
     */
    sinh: function(x) {
        if(x.complex)
            return div(sub(math.exp(x), math.exp(math.negate(x))),2);
        else
            return (Math.exp(x)-Math.exp(-x))/2;
    },
    /** Hyperbolic cosine
     * @param {Number} x
     * @returns {Number}
     */
    cosh: function(x) {
        if(x.complex)
            return div(add(math.exp(x), math.exp(math.negate(x))),2);
        else
            return (Math.exp(x)+Math.exp(-x))/2
    },
    /** Hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    tanh: function(x) {
        return div(math.sinh(x),math.cosh(x));
    },
    /** Hyperbolic cosecant
     * @param {Number} x
     * @returns {Number}
     */
    cosech: function(x) {
        return div(1,math.sinh(x));
    },
    /** Hyperbolic secant
     * @param {Number} x
     * @returns {Number}
     */
    sech: function(x) {
        return div(1,math.cosh(x));
    },
    /** Hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    coth: function(x) {
        return div(1,math.tanh(x));
    },
    /** Inverse hyperbolic sine
     * @param {Number} x
     * @returns {Number}
     */
    arcsinh: function(x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(add(mul(x,x),1))));
        else
            return Math.log(x + Math.sqrt(x*x+1));
    },
    /** Inverse hyperbolic cosine
     * @param {Number} x
     * @returns {Number}
     */
    arccosh: function (x) {
        if(x.complex)
            return math.log(add(x, math.sqrt(sub(mul(x,x),1))));
        else
            return Math.log(x + Math.sqrt(x*x-1));
    },
    /** Inverse hyperbolic tangent
     * @param {Number} x
     * @returns {Number}
     */
    arctanh: function (x) {
        if(x.complex)
            return div(math.log(div(add(1,x),sub(1,x))),2);
        else
            return 0.5 * Math.log((1+x)/(1-x));
    },
    /** Round up to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.round
     * @see Numbas.math.floor
     */
    ceil: function(x) {
        if(x.complex)
            return math.complex(math.ceil(x.re),math.ceil(x.im));
        else
            return Math.ceil(x);
    },
    /** Round down to the nearest integer. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.ceil
     * @see Numbas.math.round
     */
    floor: function(x) {
        if(x.complex)
            return math.complex(math.floor(x.re),math.floor(x.im));
        else
            return Math.floor(x);
    },
    /** Round to the nearest integer; fractional part >= 0.5 rounds up. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.ceil
     * @see Numbas.math.floor
     */
    round: function(x) {
        if(x.complex)
            return math.complex(Math.round(x.re),Math.round(x.im));
        else
            return Math.round(x);
    },
    /** Integer part of a number - chop off the fractional part. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.fract
     */
    trunc: function(x) {
        if(x.complex)
            return math.complex(math.trunc(x.re),math.trunc(x.im));
        if(x>0) {
            return Math.floor(x);
        }else{
            return Math.ceil(x);
        }
    },
    /** Fractional part of a number - Take away the whole number part. For complex numbers, real and imaginary parts are rounded independently.
     * @param {Number} x
     * @returns {Number}
     * @see Numbas.math.trunc
     */
    fract: function(x) {
        if(x.complex)
            return math.complex(math.fract(x.re),math.fract(x.im));
        return x-math.trunc(x);
    },
    /** Sign of a number - +1, 0, or -1. For complex numbers, gives the sign of the real and imaginary parts separately.
     * @param {Number} x
     * @returns {Number}
     */
    sign: function(x) {
        if(x.complex)
            return math.complex(math.sign(x.re),math.sign(x.im));
        if(x==0) {
            return 0;
        }else if (x>0) {
            return 1;
        }else {
            return -1;
        }
    },
    /** Get a random real number between `min` and `max` (inclusive)
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     * @see Numbas.math.random
     * @see Numbas.math.choose
     */
    randomrange: function(min,max)
    {
        return Math.random()*(max-min)+min;
    },
    /** Get a random number in the specified range.
     *
     * Returns a random choice from `min` to `max` at `step`-sized intervals
     *
     * If all the values in the range are appended to the list, eg `[min,max,step,v1,v2,v3,...]`, just pick randomly from the values.
     *
     * @param {range} range - `[min,max,step]`
     * @returns {Number}
     * @see Numbas.math.randomrange
     */
    random: function(range)
    {
        if(range[2]==0) {
            return math.randomrange(range[0],range[1]);
        } else {
            var num_steps = math.rangeSize(range);
            var n = Math.floor(math.randomrange(0,num_steps));
            return range[0]+n*range[2];
        }
    },
    /** Remove all the values in the list `exclude` from the list `range`
     * @param {Array.<Number>} range
     * @param {Array.<Number>} exclude
     * @returns {Array.<Number>}
     */
    except: function(range,exclude) {
        range = range.filter(function(r) {
            for(var i=0;i<exclude.length;i++) {
                if(math.eq(r,exclude[i]))
                    return false;
            }
            return true;
        });
        return range;
    },
    /** Choose one item from an array, at random
     * @param {Array} selection
     * @returns {*}
     * @throws {Numbas.Error} "math.choose.empty selection" if `selection` has length 0.
     * @see Numbas.math.randomrange
     */
    choose: function(selection)
    {
        if(selection.length==0)
            throw(new Numbas.Error('math.choose.empty selection'));
        var n = Math.floor(math.randomrange(0,selection.length));
        return selection[n];
    },
    /* Product of the numbers in the range `[a..b]`, i.e. $frac{a!}{b!}$.
     *
     * from http://dreaminginjavascript.wordpress.com/2008/11/08/combinations-and-permutations-in-javascript/
     *
     * (public domain)
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     */
    productRange: function(a,b) {
        if(a>b)
            return 1;
        var product=a,i=a;
        while (i++<b) {
            product*=i;
        }
        return product;
    },
    /** `nCk` - number of ways of picking `k` unordered elements from `n`.
     * @param {Number} n
     * @param {Number} k
     * @returns {Number}
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    combinations: function(n,k) {
        if(n.complex || k.complex) {
            throw(new Numbas.Error('math.combinations.complex'));
        }
        if(n<0) {
            throw(new Numbas.Error('math.combinations.n less than zero'));
        }
        if(k<0) {
            throw(new Numbas.Error('math.combinations.k less than zero'));
        }
        if(n<k) {
            throw(new Numbas.Error('math.combinations.n less than k'));
        }
        k=Math.max(k,n-k);
        return math.productRange(k+1,n)/math.productRange(1,n-k);
    },
    /** `nPk` - number of ways of picking `k` ordered elements from `n`.
     * @param {Number} n
     * @param {Number} k
     * @returns {Number}
     * @throws {Numbas.Error} "math.combinations.complex" if either of `n` or `k` is complex.
     */
    permutations: function(n,k) {
        if(n.complex || k.complex) {
            throw(new Numbas.Error('math.permutations.complex'));
        }
        if(n<0) {
            throw(new Numbas.Error('math.permutations.n less than zero'));
        }
        if(k<0) {
            throw(new Numbas.Error('math.permutations.k less than zero'));
        }
        if(n<k) {
            throw(new Numbas.Error('math.permutations.n less than k'));
        }
        return math.productRange(n-k+1,n);
    },
    /** Does `a` divide `b`? If either of `a` or `b` is not an integer, return `false`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Boolean}
     */
    divides: function(a,b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b))
            return false;
        return (b % a) == 0;
    },
    /** Greatest common factor (GCF), or greatest common divisor (GCD), of `a` and `b`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    gcd: function(a,b) {
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.gcf.complex'));
        if(Math.floor(a)!=a || Math.floor(b)!=b)
            return 1;
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c=0;
        if(a<b) { c=a; a=b; b=c; }
        if(b==0){return 1;}
        while(a % b != 0) {
            c=b;
            b=a % b;
            a=c;
        }
        return b;
    },
    /** Are `a` and `b` coprime? If either of `a` or `b` is not an integer, return `false`.
     * Equivalent to `gcd(a,b) = 1`.
     * @param {Number} a
     * @param {Number} b
     * @see Numbas.math.gcd
     * @returns {Boolean}
     */
    coprime: function(a,b) {
        if(a.complex || b.complex || !Numbas.util.isInt(a) || !Numbas.util.isInt(b)) {
            return true;
        }
        return math.gcd(a,b) == 1;
    },
    /** Lowest common multiple (LCM) of `a` and `b`.
     * @param {Number} a
     * @param {Number} b
     * @returns {Number}
     * @throws {Numbas.Error} "math.gcf.complex" if either of `a` or `b` is complex.
     */
    lcm: function(a,b) {
        if(arguments.length==0) {
            return 1;
        } else if(arguments.length==1) {
            return a;
        }
        if(a.complex || b.complex)
            throw(new Numbas.Error('math.lcm.complex'));
        if(arguments.length>2) {
            a = Math.floor(Math.abs(a));
            for(var i=1;i<arguments.length;i++) {
                if(arguments[i].complex) {
                    throw(new Numbas.Error('math.lcm.complex'));
                }
                b = Math.floor(Math.abs(arguments[i]));
                a = a*b/math.gcf(a,b);
            }
            return a;
        }
        a = Math.floor(Math.abs(a));
        b = Math.floor(Math.abs(b));
        var c = math.gcf(a,b);
        return a*b/c;
    },
    /** Write the range of integers `[a..b]` as an array of the form `[min,max,step]`, for use with {@link Numbas.math.random}. If either number is complex, only the real part is used.
     *
     * @param {Number} a
     * @param {Number} b
     * @returns {range}
     * @see Numbas.math.random
     */
    defineRange: function(a,b)
    {
        if(a.complex)
            a=a.re;
        if(b.complex)
            b=b.re;
        return [a,b,1];
    },
    /** Change the step size of a range created with {@link Numbas.math.defineRange}
     * @param {range} range
     * @param {Number} step
     * @returns {range}
     */
    rangeSteps: function(range,step)
    {
        if(step.complex)
            step = step.re;
        return [range[0],range[1],step];
    },
    /** Convert a range to a list - enumerate all the elements of the range
     * @param {range} range
     * @returns {Number[]}
     */
    rangeToList: function(range) {
        var start = range[0];
        var end = range[1];
        var step_size = range[2];
        var out = [];
        var n = 0;
        var t = start;
        if(step_size==0) {
            throw(new Numbas.Error('math.rangeToList.zero step size'));
        }
        if((end-start)*step_size < 0) {
            return [];
        }
        if(start==end) {
            return [start];
        }
        while(start<end ? t<=end : t>=end)
        {
            out.push(t)
            n += 1;
            t = start + n*step_size;
        }
        return out;
    },
    /** Calculate the number of elements in a range
     * @param {range} range
     * @returns {Number}
     */
    rangeSize: function(range) {
        var diff = range[1]-range[0];
        var num_steps = Math.floor(diff/range[2])+1;
        num_steps += (range[0]+num_steps*range[2] == range[1] ? 1 : 0);
        return num_steps;
    },
    /** Get a rational approximation to a real number by the continued fractions method.
     *
     * If `accuracy` is given, the returned answer will be within `Math.exp(-accuracy)` of the original number
     *
     * Based on frap.c by David Eppstein - https://www.ics.uci.edu/~eppstein/numth/frap.c
     *
     * @param {Number} n
     * @param {Number} [accuracy]
     * @returns {Array.<Number>} - [numerator,denominator]
     */
    rationalApproximation: function(n, accuracy) {
        /** Find a rational approximation to `t` with maximum denominator `limit`.
         * @param {Number} limit
         * @param {Number} t
         * @returns {Array.<Number>} `[error,numerator,denominator]`
         */
        function rat_to_limit(limit,t) {
            limit = Math.max(limit,1);
            if(t==0) {
                return [0,t,1,0];
            }
            var m00 = 1, m01 = 0;
            var m10 = 0, m11 = 1;

            var x = t;
            var ai = Math.floor(x);
            while((m10*ai + m11) <= limit) {
                var tmp = m00*ai+m01;
                m01 = m00;
                m00 = tmp;
                tmp = m10*ai+m11;
                m11 = m10;
                m10 = tmp;
                if(x==ai) {
                    break;
                }
                x = 1/(x-ai);
                ai = Math.floor(x);
            }

            var n1 = m00;
            var d1 = m10;
            var err1 = (t-n1/d1);

            ai = Math.floor((limit-m11)/m10);
            var n2 = m00*ai + m01;
            var d2 = m10*ai+m11;
            var err2 = (t-n2/d2);
            if(Math.abs(err1)<=Math.abs(err2)) {
                return [err1,n1,d1];
            } else {
                return [err2,n2,d2];
            }
        }

        if(accuracy==undefined) {
            accuracy = 15;
        }
        var err_in = Math.exp(-accuracy);
        var limit = 100000000000;
        var l_curr = 1;
        var res = rat_to_limit(l_curr,n);
        while(Math.abs(res[0])>err_in && l_curr<limit) {
            l_curr *= 10;
            res = rat_to_limit(l_curr,n);
        }
        return [res[1],res[2]];
    },
    /** The first 1000 primes */
    primes: [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541,547,557,563,569,571,577,587,593,599,601,607,613,617,619,631,641,643,647,653,659,661,673,677,683,691,701,709,719,727,733,739,743,751,757,761,769,773,787,797,809,811,821,823,827,829,839,853,857,859,863,877,881,883,887,907,911,919,929,937,941,947,953,967,971,977,983,991,997,1009,1013,1019,1021,1031,1033,1039,1049,1051,1061,1063,1069,1087,1091,1093,1097,1103,1109,1117,1123,1129,1151,1153,1163,1171,1181,1187,1193,1201,1213,1217,1223,1229,1231,1237,1249,1259,1277,1279,1283,1289,1291,1297,1301,1303,1307,1319,1321,1327,1361,1367,1373,1381,1399,1409,1423,1427,1429,1433,1439,1447,1451,1453,1459,1471,1481,1483,1487,1489,1493,1499,1511,1523,1531,1543,1549,1553,1559,1567,1571,1579,1583,1597,1601,1607,1609,1613,1619,1621,1627,1637,1657,1663,1667,1669,1693,1697,1699,1709,1721,1723,1733,1741,1747,1753,1759,1777,1783,1787,1789,1801,1811,1823,1831,1847,1861,1867,1871,1873,1877,1879,1889,1901,1907,1913,1931,1933,1949,1951,1973,1979,1987,1993,1997,1999,2003,2011,2017,2027,2029,2039,2053,2063,2069,2081,2083,2087,2089,2099,2111,2113,2129,2131,2137,2141,2143,2153,2161,2179,2203,2207,2213,2221,2237,2239,2243,2251,2267,2269,2273,2281,2287,2293,2297,2309,2311,2333,2339,2341,2347,2351,2357,2371,2377,2381,2383,2389,2393,2399,2411,2417,2423,2437,2441,2447,2459,2467,2473,2477,2503,2521,2531,2539,2543,2549,2551,2557,2579,2591,2593,2609,2617,2621,2633,2647,2657,2659,2663,2671,2677,2683,2687,2689,2693,2699,2707,2711,2713,2719,2729,2731,2741,2749,2753,2767,2777,2789,2791,2797,2801,2803,2819,2833,2837,2843,2851,2857,2861,2879,2887,2897,2903,2909,2917,2927,2939,2953,2957,2963,2969,2971,2999,3001,3011,3019,3023,3037,3041,3049,3061,3067,3079,3083,3089,3109,3119,3121,3137,3163,3167,3169,3181,3187,3191,3203,3209,3217,3221,3229,3251,3253,3257,3259,3271,3299,3301,3307,3313,3319,3323,3329,3331,3343,3347,3359,3361,3371,3373,3389,3391,3407,3413,3433,3449,3457,3461,3463,3467,3469,3491,3499,3511,3517,3527,3529,3533,3539,3541,3547,3557,3559,3571,3581,3583,3593,3607,3613,3617,3623,3631,3637,3643,3659,3671,3673,3677,3691,3697,3701,3709,3719,3727,3733,3739,3761,3767,3769,3779,3793,3797,3803,3821,3823,3833,3847,3851,3853,3863,3877,3881,3889,3907,3911,3917,3919,3923,3929,3931,3943,3947,3967,3989,4001,4003,4007,4013,4019,4021,4027,4049,4051,4057,4073,4079,4091,4093,4099,4111,4127,4129,4133,4139,4153,4157,4159,4177,4201,4211,4217,4219,4229,4231,4241,4243,4253,4259,4261,4271,4273,4283,4289,4297,4327,4337,4339,4349,4357,4363,4373,4391,4397,4409,4421,4423,4441,4447,4451,4457,4463,4481,4483,4493,4507,4513,4517,4519,4523,4547,4549,4561,4567,4583,4591,4597,4603,4621,4637,4639,4643,4649,4651,4657,4663,4673,4679,4691,4703,4721,4723,4729,4733,4751,4759,4783,4787,4789,4793,4799,4801,4813,4817,4831,4861,4871,4877,4889,4903,4909,4919,4931,4933,4937,4943,4951,4957,4967,4969,4973,4987,4993,4999,5003,5009,5011,5021,5023,5039,5051,5059,5077,5081,5087,5099,5101,5107,5113,5119,5147,5153,5167,5171,5179,5189,5197,5209,5227,5231,5233,5237,5261,5273,5279,5281,5297,5303,5309,5323,5333,5347,5351,5381,5387,5393,5399,5407,5413,5417,5419,5431,5437,5441,5443,5449,5471,5477,5479,5483,5501,5503,5507,5519,5521,5527,5531,5557,5563,5569,5573,5581,5591,5623,5639,5641,5647,5651,5653,5657,5659,5669,5683,5689,5693,5701,5711,5717,5737,5741,5743,5749,5779,5783,5791,5801,5807,5813,5821,5827,5839,5843,5849,5851,5857,5861,5867,5869,5879,5881,5897,5903,5923,5927,5939,5953,5981,5987,6007,6011,6029,6037,6043,6047,6053,6067,6073,6079,6089,6091,6101,6113,6121,6131,6133,6143,6151,6163,6173,6197,6199,6203,6211,6217,6221,6229,6247,6257,6263,6269,6271,6277,6287,6299,6301,6311,6317,6323,6329,6337,6343,6353,6359,6361,6367,6373,6379,6389,6397,6421,6427,6449,6451,6469,6473,6481,6491,6521,6529,6547,6551,6553,6563,6569,6571,6577,6581,6599,6607,6619,6637,6653,6659,6661,6673,6679,6689,6691,6701,6703,6709,6719,6733,6737,6761,6763,6779,6781,6791,6793,6803,6823,6827,6829,6833,6841,6857,6863,6869,6871,6883,6899,6907,6911,6917,6947,6949,6959,6961,6967,6971,6977,6983,6991,6997,7001,7013,7019,7027,7039,7043,7057,7069,7079,7103,7109,7121,7127,7129,7151,7159,7177,7187,7193,72077211,7213,7219,7229,7237,7243,7247,7253,7283,7297,7307,7309,7321,7331,7333,7349,7351,7369,7393,7411,7417,7433,7451,7457,7459,7477,7481,7487,7489,7499,7507,7517,7523,7529,7537,7541,7547,7549,7559,7561,7573,7577,7583,7589,7591,7603,7607,7621,7639,7643,7649,7669,7673,7681,7687,7691,7699,7703,7717,7723,7727,7741,7753,7757,7759,7789,7793,7817,7823,7829,7841,7853,7867,7873,7877,7879,7883,7901,7907,7919],
    /** Factorise n. When n=2^(a1)*3^(a2)*5^(a3)*..., this returns the powers [a1,a2,a3,...]
     *
     * @param {Number} n
     * @returns {Array.<Number>} - exponents of the prime factors of n
     */
    factorise: function(n) {
        if(n<=0) {
            return [];
        }
        var factors = [];
        for(var i=0;i<math.primes.length;i++) {
            var acc = 0;
            var p = math.primes[i];
            while(n%p==0) {
                acc += 1;
                n /= p;
            }
            factors.push(acc);
            if(n==1) {
                break;
            }
        }
        return factors;
    },
    /** Sum the elements in the given list
     *
     * @param {Array.<Number>} list
     * @returns {Number}
     */
    sum: function(list) {
        var total = 0;
        var l = list.length;
        if(l==0) {
            return 0;
        }
        for(var i=0;i<l;i++) {
            total = math.add(total,list[i]);
        }
        return total;
    }
};
math.gcf = math.gcd;
var add = math.add, sub = math.sub, mul = math.mul, div = math.div, eq = math.eq, neq = math.neq, negate = math.negate;


/** A rational number.
 * @constructor
 * @param {Number} numerator
 * @param {Number} denominator
 *
 * @property {Number} numerator
 * @property {Number} denominator
 */
var Fraction = math.Fraction = function(numerator,denominator) {
    this.numerator = Math.round(numerator);
    this.denominator = Math.round(denominator);
}
Fraction.prototype = {
    toString: function() {
        return this.numerator+'/'+this.denominator;
    },
    toFloat: function() {
        return this.numerator / this.denominator;
    },
    reduce: function() {
        if(this.denominator==0) {
            return;
        }
        if(this.denominator<0) {
            this.numerator = -this.numerator;
            this.denominator = -this.denominator;
        }
        var g = math.gcd(this.numerator,this.denominator);
        this.numerator /= g;
        this.denominator /= g;
    },
    add: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator, denominator;
        if(this.denominator == b.denominator) {
            numerator = this.numerator + b.numerator;
            denominator = this.denominator;
        } else {
            numerator = this.numerator*b.denominator + b.numerator*this.denominator;
            denominator = this.denominator * b.denominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    subtract: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator;
        var numerator, denominator;
        if(this.denominator == b.denominator) {
            numerator = this.numerator - b.numerator;
            denominator = this.denominator;
        } else {
            numerator = this.numerator*b.denominator - b.numerator*this.denominator;
            denominator = this.denominator * b.denominator;
        }
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    multiply: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.numerator * b.numerator;
        var denominator = this.denominator * b.denominator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    divide: function(b) {
        if(typeof(b)==='number') {
            b = Fraction.fromFloat(b);
        }
        var numerator = this.numerator * b.denominator;
        var denominator = this.denominator * b.numerator;
        var f = new Fraction(numerator, denominator);
        f.reduce();
        return f;
    },
    reciprocal: function() {
        return new Fraction(this.denominator, this.numerator);
    },
    negate: function() {
        return new Fraction(-this.numerator, this.denominator);
    },
    equals: function(b) {
        return this.subtract(b).numerator==0;
    }
}
Fraction.zero = new Fraction(0,1);
Fraction.one = new Fraction(1,1);
Fraction.fromFloat = function(n) {
    var approx = math.rationalApproximation(n);
    return new Fraction(approx[0],approx[1]);
}
Fraction.fromDecimal = function(n) {
    var approx = n.toFraction();
    return new Fraction(approx[0].toNumber(),approx[1].toNumber());
}

/** A list of a vector's components.
 * @typedef vector
 *  @type {Array.<Number>}
 */
/** Vector operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of vectors don't line up exactly
 * @namespace Numbas.vectormath
 */
var vectormath = Numbas.vectormath = {
    /** Negate a vector - negate each of its components
     * @param {vector} v
     * @returns {vector}
     */
    negate: function(v) {
        return v.map(function(x) { return negate(x); });
    },
    /** Add two vectors
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    add: function(a,b) {
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.map(function(x,i){ return add(x,b[i]||0) });
    },
    /** Subtract one vector from another
     * @param {vector} a
     * @param {vector} b
     * @returns {vector}
     */
    sub: function(a,b) {
        if(b.length>a.length)
        {
            return b.map(function(x,i){ return sub(a[i]||0,x) });
        }
        else
        {
            return a.map(function(x,i){ return sub(x,b[i]||0) });
        }
    },
    /** Multiply by a scalar
     * @param {Number} k
     * @param {vector} v
     * @returns {vector}
     */
    mul: function(k,v) {
        return v.map(function(x){ return mul(k,x) });
    },
    /** Divide by a scalar
     * @param {vector} v
     * @param {Number} k
     * @returns {vector}
     */
    div: function(v,k) {
        return v.map(function(x){ return div(x,k); });
    },
    /** Vector dot product - each argument can be a vector, or a matrix with one row or one column, which is converted to a vector.
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {Number}
     * @throws {Numbas.Error} "vectormaths.dot.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
     */
    dot: function(a,b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a)
        {
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        //Same check for B
        if('rows' in b)
        {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.dot.matrix too big'));
        }
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s,x,i){ return add(s,mul(x,b[i]||0)) },0);
    },
    /** Vector cross product - each argument can be a vector, or a matrix with one row, which is converted to a vector.
     *
     * @param {vector|matrix} a
     * @param {vector|matrix} b
     * @returns {vector}
     *
     * @throws {Numbas.Error} "vectormaths.cross.matrix too big" if either of `a` or `b` is bigger than `1xN` or `Nx1`.
     * @throws {Numbas.Error} "vectormath.cross.not 3d" if either of the vectors is not 3D.
     */
    cross: function(a,b) {
        //check if A is a matrix object. If it's the right shape, we can use it anyway
        if('rows' in a)
        {
            if(a.rows==1)
                a = a[0];
            else if(a.columns==1)
                a = a.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        //Same check for B
        if('rows' in b)
        {
            if(b.rows==1)
                b = b[0];
            else if(b.columns==1)
                b = b.map(function(x){return x[0]});
            else
                throw(new Numbas.Error('vectormath.cross.matrix too big'));
        }
        if(a.length!=3 || b.length!=3)
            throw(new Numbas.Error('vectormath.cross.not 3d'));
        return [
                sub( mul(a[1],b[2]), mul(a[2],b[1]) ),
                sub( mul(a[2],b[0]), mul(a[0],b[2]) ),
                sub( mul(a[0],b[1]), mul(a[1],b[0]) )
                ];
    },
    /** Length of a vector, squared
     * @param {vector} a
     * @returns {Number}
     */
    abs_squared: function(a) {
        return a.reduce(function(s,x){ return s + mul(x,x); },0);
    },
    /** Length of a vector
     * @param {vector} a
     * @returns {Number}
     */
    abs: function(a) {
        return Math.sqrt( a.reduce(function(s,x){ return s + mul(x,x); },0) );
    },
    /** Angle between vectors a and b, in radians, or 0 if either vector has length 0.
     * @param {vector} a
     * @param {vector} b
     * @returns {Number}
     */
    angle: function(a,b) {
        var dot = vectormath.dot(a,b);
        var da = vectormath.abs_squared(a);
        var db = vectormath.abs_squared(b);
        if(da*db==0) {
            return 0;
        }
        var d = Math.sqrt(da*db);
        return math.arccos(dot/d);
    },
    /** Are two vectors equal? True if each pair of corresponding components is equal.
     * @param {vector} a
     * @param {vector} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        if(b.length>a.length)
        {
            var c = b;
            b = a;
            a = c;
        }
        return a.reduce(function(s,x,i){return s && eq(x,b[i]||0)},true);
    },
    /** Are two vectors unequal?
     * @param {vector} a
     * @param {vector} b
     * @returns {Boolean}
     * @see Numbas.vectormath.eq
     */
    neq: function(a,b) {
        return !vectormath.eq(a,b);
    },
    /** Multiply a vector on the left by a matrix
     * @param {matrix} m
     * @param {vector} v
     * @returns {vector}
     */
    matrixmul: function(m,v) {
        return m.map(function(row){
            return row.reduce(function(s,x,i){ return add(s,mul(x,v[i]||0)); },0);
        });
    },
    /** Multiply a vector on the right by a matrix.
     * The vector is considered as a column vector.
     * @param {vector} v
     * @param {matrix} m
     * @returns {vector}
     */
    vectormatrixmul: function(v,m) {
        var out = [];
        for(var i=0;i<m.columns;i++) {
            out.push(v.reduce(function(s,x,j){ var c = j<m.rows ? (m[j][i]||0) : 0; return add(s,mul(x,c)); },0));
        }
        return out;
    },
    /** Apply given function to each element
     * @param {vector} v
     * @param {Function} fn
     * @returns {vector}
     */
    map: function(v,fn) {
        return v.map(fn);
    },
    /** Round each element to given number of decimal places
     * @param {vector} v
     * @param {Number} dp - number of decimal places
     * @returns {vector}
     */
    precround: function(v,dp) {
        return vectormath.map(v,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures
     * @param {vector} v
     * @param {Number} sf - number of decimal places
     * @returns {vector}
     */
    siground: function(v,sf) {
        return vectormath.map(v,function(n){return math.siground(n,sf);});
    },
    /** Transpose of a vector
     * @param {vector} v
     * @returns {matrix}
     */
    transpose: function(v) {
        var matrix = [v.slice()];
        matrix.rows = 1;
        matrix.columns = v.length;
        return matrix;
    },
    /** Convert a vector to a 1-column matrix
     * @param {vector} v
     * @returns {matrix}
     */
    toMatrix: function(v) {
        var m = v.map(function(n){return [n]});
        m.rows = m.length;
        m.columns = 1;
        return m;
    },

    /** Is every component of this vector zero?
     * @param {vector} v
     * @returns {Boolean}
     */
    is_zero: function(v) {
        return v.every(function(c){return c==0;});
    }
}
/** A two-dimensional matrix: an array of rows, each of which is an array of numbers.
 * @typedef matrix
 * @type {Array.<Array.<Number>>}
 * @property {Number} rows - The number of rows in the matrix
 * @property {Number} columns - The number of columns in the matrix
 */
/** Matrix operations.
 *
 * These operations are very lax about the dimensions of vectors - they stick zeros in when pairs of matrices don't line up exactly
 * @namespace Numbas.matrixmath
 */
var matrixmath = Numbas.matrixmath = {
    /** Negate a matrix - negate each of its elements 
     * @param {matrix} m
     * @returns {matrix}
     */
    negate: function(m) {
        var matrix = [];
        for(var i=0;i<m.rows;i++) {
            matrix.push(m[i].map(function(x){ return negate(x) }));
        }
        matrix.rows = m.rows;
        matrix.columns = m.columns;
        return matrix;
    },
    /** Add two matrices.
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     */
    add: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        var matrix = [];
        for(var i=0;i<rows;i++)
        {
            var row = [];
            matrix.push(row);
            for(var j=0;j<columns;j++)
            {
                row[j] = add(a[i][j]||0,b[i][j]||0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Subtract one matrix from another
     *
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     */
    sub: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        var matrix = [];
        for(var i=0;i<rows;i++)
        {
            var row = [];
            matrix.push(row);
            for(var j=0;j<columns;j++)
            {
                row[j] = sub(a[i][j]||0,b[i][j]||0);
            }
        }
        matrix.rows = rows;
        matrix.columns = columns;
        return matrix;
    },
    /** Matrix determinant. Only works up to 3x3 matrices.
     * @param {matrix} m
     * @returns {Number}
     * @throws {Numbas.Error} "matrixmath.abs.too big" if the matrix has more than 3 rows.
     */
    abs: function(m) {
        if(m.rows!=m.columns)
            throw(new Numbas.Error('matrixmath.abs.non-square'));
        //abstraction failure!
        switch(m.rows)
        {
        case 1:
            return m[0][0];
        case 2:
            return sub( mul(m[0][0],m[1][1]), mul(m[0][1],m[1][0]) );
        case 3:
            return add( sub(
                            mul(m[0][0],sub(mul(m[1][1],m[2][2]),mul(m[1][2],m[2][1]))),
                            mul(m[0][1],sub(mul(m[1][0],m[2][2]),mul(m[1][2],m[2][0])))
                        ),
                        mul(m[0][2],sub(mul(m[1][0],m[2][1]),mul(m[1][1],m[2][0])))
                    );
        default:
            throw(new Numbas.Error('matrixmath.abs.too big'));
        }
    },
    /** Multiply a matrix by a scalar
     * @param {Number} k
     * @param {matrix} m
     * @returns {matrix}
     */
    scalarmul: function(k,m) {
        var out = m.map(function(row){ return row.map(function(x){ return mul(k,x); }); });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Divide a matrix by a scalar
     * @param {matrix} m
     * @param {Number} k
     * @returns {matrix}
     */
    scalardiv: function(m,k) {
        var out = m.map(function(row){ return row.map(function(x){ return div(x,k); }); });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Multiply two matrices
     * @param {matrix} a
     * @param {matrix} b
     * @returns {matrix}
     * @throws {Numbas.Error} "matrixmath.mul.different sizes" if `a` doesn't have as many columns as `b` has rows.
     */
    mul: function(a,b) {
        if(a.columns!=b.rows)
            throw(new Numbas.Error('matrixmath.mul.different sizes'));
        var out = [];
        out.rows = a.rows;
        out.columns = b.columns;
        for(var i=0;i<a.rows;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<b.columns;j++)
            {
                var s = 0;
                for(var k=0;k<a.columns;k++)
                {
                    s = add(s,mul(a[i][k],b[k][j]));
                }
                row.push(s);
            }
        }
        return out;
    },
    /** Are two matrices equal? True if each pair of corresponding elements is equal.
     * @param {matrix} a
     * @param {matrix} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        var rows = Math.max(a.rows,b.rows);
        var columns = Math.max(a.columns,b.columns);
        for(var i=0;i<rows;i++)
        {
            var rowA = a[i] || [];
            var rowB = b[i] || [];
            for(var j=0;j<columns;j++)
            {
                if(!eq(rowA[j]||0,rowB[j]||0))
                    return false;
            }
        }
        return true;
    },
    /** Are two matrices unequal?
     * @param {matrix} a
     * @param {matrix} b
     * @returns {Boolean}
     * @see Numbas.matrixmath.eq
     */
    neq: function(a,b) {
        return !matrixmath.eq(a,b);
    },
    /** Make an `NxN` identity matrix.
     * @param {Number} n
     * @returns {matrix}
     */
    id: function(n) {
        var out = [];
        out.rows = out.columns = n;
        for(var i=0;i<n;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<n;j++)
                row.push(j==i ? 1 : 0);
        }
        return out;
    },
    /** Matrix transpose
     * @param {matrix} m
     * @returns {matrix}
     */
    transpose: function(m) {
        var out = [];
        out.rows = m.columns;
        out.columns = m.rows;
        for(var i=0;i<m.columns;i++)
        {
            var row = [];
            out.push(row);
            for(var j=0;j<m.rows;j++)
            {
                row.push(m[j][i]||0);
            }
        }
        return out;
    },

    /** Sum of every cell
     * @param {matrix} m
     * @returns {Number}
     */
    sum_cells: function(m) {
        var t = 0;
        m.forEach(function(row) {
            row.forEach(function(cell) {
                t += cell;
            });
        });
        return t;
    },

    /** Apply given function to each element
     * @param {matrix} m
     * @param {Function} fn
     * @returns {matrix}
     */
    map: function(m,fn) {
        var out = m.map(function(row){
            return row.map(fn);
        });
        out.rows = m.rows;
        out.columns = m.columns;
        return out;
    },
    /** Round each element to given number of decimal places
     * @param {matrix} m
     * @param {Number} dp - number of decimal places
     * @returns {matrix}
     */
    precround: function(m,dp) {
        return matrixmath.map(m,function(n){return math.precround(n,dp);});
    },
    /** Round each element to given number of significant figures
     * @param {matrix} m
     * @param {Number} sf - number of decimal places
     * @returns {matrix}
     */
    siground: function(m,sf) {
        return matrixmath.map(m,function(n){return math.siground(n,sf);});
    }
}
/** A set of objects: no item occurs more than once.
 * @typedef set
 * @type Array
 */
/** Set operations.
 *
 * @namespace Numbas.setmath
 */
var setmath = Numbas.setmath = {
    /** Does the set contain the given element?
     * @param {set} set
     * @param {*} element
     * @returns {Boolean}
     */
    contains: function(set,element) {
        for(var i=0,l=set.length;i<l;i++) {
            if(Numbas.util.eq(set[i],element)) {
                return true;
            }
        }
    },
    /** Union of two sets
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    union: function(a,b) {
        var out = a.slice();
        for(var i=0,l=b.length;i<l;i++) {
            if(!setmath.contains(a,b[i])) {
                out.push(b[i]);
            }
        }
        return out;
    },
    /** Intersection of two sets
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    intersection: function(a,b) {
        return a.filter(function(v) {
            return setmath.contains(b,v);
        });
    },
    /** Are two sets equal? Yes if a,b and (a intersect b) all have the same length
     * @param {set} a
     * @param {set} b
     * @returns {Boolean}
     */
    eq: function(a,b) {
        return a.length==b.length && setmath.intersection(a,b).length==a.length;
    },
    /** Set minus - remove b's elements from a
     * @param {set} a
     * @param {set} b
     * @returns {set}
     */
    minus: function(a,b) {
        return a.filter(function(v){ return !setmath.contains(b,v); });
    },
    /** Size of a set
     * @param {set} set
     * @returns {Number}
     */
    size: function(set) {
        return set.length;
    }
}
});
