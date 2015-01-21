/**
 * easyXDM
 * http://easyxdm.net/
 * Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function (window, document, location, setTimeout, decodeURIComponent, encodeURIComponent) {
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global JSON, XMLHttpRequest, window, escape, unescape, ActiveXObject */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    var global = this;
    var channelId = Math.floor(Math.random() * 10000); // randomize the initial id in case of multiple closures loaded 
    var emptyFn = Function.prototype;
    var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/; // returns groups for protocol (2), domain (3) and port (4) 
    var reParent = /[\-\w]+\/\.\.\//; // matches a foo/../ expression 
    var reDoubleSlash = /([^:])\/\//g; // matches // anywhere but in the protocol
    var namespace = ""; // stores namespace under which easyXDM object is stored on the page (empty if object is global)
    var easyXDM = {};
    var _easyXDM = window.easyXDM; // map over global easyXDM in case of overwrite
    var IFRAME_PREFIX = "easyXDM_";
    var HAS_NAME_PROPERTY_BUG;
    var useHash = false; // whether to use the hash over the query
    var flashVersion; // will be set if using flash
    var HAS_FLASH_THROTTLED_BUG;


    // http://peter.michaux.ca/articles/feature-detection-state-of-the-art-browser-scripting
    function isHostMethod(object, property) {
        var t = typeof object[property];
        return t == 'function' ||
        (!!(t == 'object' && object[property])) ||
        t == 'unknown';
    }

    function isHostObject(object, property) {
        return !!(typeof (object[property]) == 'object' && object[property]);
    }

    // end

    // http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
    function isArray(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    }

    // end
    function hasFlash() {
        var name = "Shockwave Flash", mimeType = "application/x-shockwave-flash";

        if (!undef(navigator.plugins) && typeof navigator.plugins[name] == "object") {
            // adapted from the swfobject code
            var description = navigator.plugins[name].description;
            if (description && !undef(navigator.mimeTypes) && navigator.mimeTypes[mimeType] && navigator.mimeTypes[mimeType].enabledPlugin) {
                flashVersion = description.match(/\d+/g);
            }
        }
        if (!flashVersion) {
            var flash;
            try {
                flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
                flashVersion = Array.prototype.slice.call(flash.GetVariable("$version").match(/(\d+),(\d+),(\d+),(\d+)/), 1);
                flash = null;
            }
            catch (notSupportedException) {
            }
        }
        if (!flashVersion) {
            return false;
        }
        var major = parseInt(flashVersion[0], 10), minor = parseInt(flashVersion[1], 10);
        HAS_FLASH_THROTTLED_BUG = major > 9 && minor > 0;
        return true;
    }

    /*
     * Cross Browser implementation for adding and removing event listeners.
     */
    var on, un;
    if (isHostMethod(window, "addEventListener")) {
        on = function (target, type, listener) {
            target.addEventListener(type, listener, false);
        };
        un = function (target, type, listener) {
            target.removeEventListener(type, listener, false);
        };
    }
    else if (isHostMethod(window, "attachEvent")) {
        on = function (object, sEvent, fpNotify) {
            object.attachEvent("on" + sEvent, fpNotify);
        };
        un = function (object, sEvent, fpNotify) {
            object.detachEvent("on" + sEvent, fpNotify);
        };
    }
    else {
        throw new Error("Browser not supported");
    }

    /*
     * Cross Browser implementation of DOMContentLoaded.
     */
    var domIsReady = false, domReadyQueue = [], readyState;
    if ("readyState" in document) {
        // If browser is WebKit-powered, check for both 'loaded' (legacy browsers) and
        // 'interactive' (HTML5 specs, recent WebKit builds) states.
        // https://bugs.webkit.org/show_bug.cgi?id=45119
        readyState = document.readyState;
        domIsReady = readyState == "complete" || (~navigator.userAgent.indexOf('AppleWebKit/') && (readyState == "loaded" || readyState == "interactive"));
    }
    else {
        // If readyState is not supported in the browser, then in order to be able to fire whenReady functions apropriately
        // when added dynamically _after_ DOM load, we have to deduce wether the DOM is ready or not.
        // We only need a body to add elements to, so the existence of document.body is enough for us.
        domIsReady = !!document.body;
    }

    function dom_onReady() {
        if (domIsReady) {
            return;
        }
        domIsReady = true;
        for (var i = 0; i < domReadyQueue.length; i++) {
            domReadyQueue[i]();
        }
        domReadyQueue.length = 0;
    }


    if (!domIsReady) {
        if (isHostMethod(window, "addEventListener")) {
            on(document, "DOMContentLoaded", dom_onReady);
        }
        else {
            on(document, "readystatechange", function () {
                if (document.readyState == "complete") {
                    dom_onReady();
                }
            });
            if (document.documentElement.doScroll && window === top) {
                var doScrollCheck = function () {
                    if (domIsReady) {
                        return;
                    }
                    // http://javascript.nwbox.com/IEContentLoaded/
                    try {
                        document.documentElement.doScroll("left");
                    }
                    catch (e) {
                        setTimeout(doScrollCheck, 1);
                        return;
                    }
                    dom_onReady();
                };
                doScrollCheck();
            }
        }

        // A fallback to window.onload, that will always work
        on(window, "load", dom_onReady);
    }
    /**
     * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
     * If functions are added after this event then they will be executed immediately.
     * @param {function} fn The function to add
     * @param {Object} scope An optional scope for the function to be called with.
     */
    function whenReady(fn, scope) {
        if (domIsReady) {
            fn.call(scope);
            return;
        }
        domReadyQueue.push(function () {
            fn.call(scope);
        });
    }

    /**
     * Returns an instance of easyXDM from the parent window with
     * respect to the namespace.
     *
     * @return An instance of easyXDM (in the parent window)
     */
    function getParentObject() {
        var obj = parent;
        if (namespace !== "") {
            for (var i = 0, ii = namespace.split(".") ; i < ii.length; i++) {
                obj = obj[ii[i]];
            }
        }
        return obj.easyXDM;
    }

    /**
     * Removes easyXDM variable from the global scope. It also returns control
     * of the easyXDM variable to whatever code used it before.
     *
     * @param {String} ns A string representation of an object that will hold
     *                    an instance of easyXDM.
     * @return An instance of easyXDM
     */
    function noConflict(ns) {

        window.easyXDM = _easyXDM;
        namespace = ns;
        if (namespace) {
            IFRAME_PREFIX = "easyXDM_" + namespace.replace(".", "_") + "_";
        }
        return easyXDM;
    }

    /*
     * Methods for working with URLs
     */
    /**
     * Get the domain name from a url.
     * @param {String} url The url to extract the domain from.
     * @return The domain part of the url.
     * @type {String}
     */
    function getDomainName(url) {
        return url.match(reURI)[3];
    }

    /**
     * Get the port for a given URL, or "" if none
     * @param {String} url The url to extract the port from.
     * @return The port part of the url.
     * @type {String}
     */
    function getPort(url) {
        return url.match(reURI)[4] || "";
    }

    /**
     * Returns  a string containing the schema, domain and if present the port
     * @param {String} url The url to extract the location from
     * @return {String} The location part of the url
     */
    function getLocation(url) {
        var m = url.toLowerCase().match(reURI);
        //alert(m);
        var proto = m[2], domain = m[3], port = m[4] || "";
        if ((proto == "http:" && port == ":80") || (proto == "https:" && port == ":443")) {
            port = "";
        }
        return proto + "//" + domain + port;
    }

    /**
     * Resolves a relative url into an absolute one.
     * @param {String} url The path to resolve.
     * @return {String} The resolved url.
     */
    function resolveUrl(url) {

        // replace all // except the one in proto with /
        url = url.replace(reDoubleSlash, "$1/");

        // If the url is a valid url we do nothing
        if (!url.match(/^(http||https):\/\//)) {
            // If this is a relative path
            var path = (url.substring(0, 1) === "/") ? "" : location.pathname;
            if (path.substring(path.length - 1) !== "/") {
                path = path.substring(0, path.lastIndexOf("/") + 1);
            }

            url = location.protocol + "//" + location.host + path + url;
        }

        // reduce all 'xyz/../' to just '' 
        while (reParent.test(url)) {
            url = url.replace(reParent, "");
        }

        return url;
    }

    /**
     * Appends the parameters to the given url.<br/>
     * The base url can contain existing query parameters.
     * @param {String} url The base url.
     * @param {Object} parameters The parameters to add.
     * @return {String} A new valid url with the parameters appended.
     */
    function appendQueryParameters(url, parameters) {

        var hash = "", indexOf = url.indexOf("#");
        if (indexOf !== -1) {
            hash = url.substring(indexOf);
            url = url.substring(0, indexOf);
        }
        var q = [];
        for (var key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                q.push(key + "=" + encodeURIComponent(parameters[key]));
            }
        }
        return url + (useHash ? "#" : (url.indexOf("?") == -1 ? "?" : "&")) + q.join("&") + hash;
    }


    // build the query object either from location.query, if it contains the xdm_e argument, or from location.hash
    var query = (function (input) {
        input = input.substring(1).split("&");
        var data = {}, pair, i = input.length;
        while (i--) {
            pair = input[i].split("=");
            data[pair[0]] = decodeURIComponent(pair[1]);
        }
        return data;
    }(/xdm_e=/.test(location.search) ? location.search : location.hash));

    /*
     * Helper methods
     */
    /**
     * Helper for checking if a variable/property is undefined
     * @param {Object} v The variable to test
     * @return {Boolean} True if the passed variable is undefined
     */
    function undef(v) {
        return typeof v === "undefined";
    }

    /**
     * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
     * @return {JSON} A valid JSON conforming object, or null if not found.
     */
    var getJSON = function () {
        var cached = {};
        var obj = {
            a: [1, 2, 3]
        }, json = "{\"a\":[1,2,3]}";

        if (typeof JSON != "undefined" && typeof JSON.stringify === "function" && JSON.stringify(obj).replace((/\s/g), "") === json) {
            // this is a working JSON instance
            return JSON;
        }
        if (Object.toJSON) {
            if (Object.toJSON(obj).replace((/\s/g), "") === json) {
                // this is a working stringify method
                cached.stringify = Object.toJSON;
            }
        }

        if (typeof String.prototype.evalJSON === "function") {
            obj = json.evalJSON();
            if (obj.a && obj.a.length === 3 && obj.a[2] === 3) {
                // this is a working parse method           
                cached.parse = function (str) {
                    return str.evalJSON();
                };
            }
        }

        if (cached.stringify && cached.parse) {
            // Only memoize the result if we have valid instance
            getJSON = function () {
                return cached;
            };
            return cached;
        }
        return null;
    };

    /**
     * Applies properties from the source object to the target object.<br/>
     * @param {Object} target The target of the properties.
     * @param {Object} source The source of the properties.
     * @param {Boolean} noOverwrite Set to True to only set non-existing properties.
     */
    function apply(destination, source, noOverwrite) {
        var member;
        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                if (prop in destination) {
                    member = source[prop];
                    if (typeof member === "object") {
                        apply(destination[prop], member, noOverwrite);
                    }
                    else if (!noOverwrite) {
                        destination[prop] = source[prop];
                    }
                }
                else {
                    destination[prop] = source[prop];
                }
            }
        }
        return destination;
    }

    // This tests for the bug in IE where setting the [name] property using javascript causes the value to be redirected into [submitName].
    function testForNamePropertyBug() {
        var form = document.body.appendChild(document.createElement("form")), input = form.appendChild(document.createElement("input"));
        input.name = IFRAME_PREFIX + "TEST" + channelId; // append channelId in order to avoid caching issues
        HAS_NAME_PROPERTY_BUG = input !== form.elements[input.name];
        document.body.removeChild(form);
    }

    /**
     * Creates a frame and appends it to the DOM.
     * @param config {object} This object can have the following properties
     * <ul>
     * <li> {object} prop The properties that should be set on the frame. This should include the 'src' property.</li>
     * <li> {object} attr The attributes that should be set on the frame.</li>
     * <li> {DOMElement} container Its parent element (Optional).</li>
     * <li> {function} onLoad A method that should be called with the frames contentWindow as argument when the frame is fully loaded. (Optional)</li>
     * </ul>
     * @return The frames DOMElement
     * @type DOMElement
     */
    function createFrame(config) {
        if (undef(HAS_NAME_PROPERTY_BUG)) {
            testForNamePropertyBug();
        }
        var frame;
        // This is to work around the problems in IE6/7 with setting the name property. 
        // Internally this is set as 'submitName' instead when using 'iframe.name = ...'
        // This is not required by easyXDM itself, but is to facilitate other use cases 
        if (HAS_NAME_PROPERTY_BUG) {
            frame = document.createElement("<iframe name=\"" + config.props.name + "\"/>");
        }
        else {
            frame = document.createElement("IFRAME");
            frame.name = config.props.name;
        }

        frame.id = frame.name = config.props.name;
        delete config.props.name;

        if (typeof config.container == "string") {
            config.container = document.getElementById(config.container);
        }

        if (!config.container) {
            // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
            apply(frame.style, {
                position: "absolute",
                top: "-2000px",
                // Avoid potential horizontal scrollbar
                left: "0px"
            });
            config.container = document.body;
        }

        // HACK: IE cannot have the src attribute set when the frame is appended
        //       into the container, so we set it to "javascript:false" as a
        //       placeholder for now.  If we left the src undefined, it would
        //       instead default to "about:blank", which causes SSL mixed-content
        //       warnings in IE6 when on an SSL parent page.
        var src = config.props.src;
        config.props.src = "javascript:false";

        // transfer properties to the frame
        apply(frame, config.props);

        frame.border = frame.frameBorder = 0;
        frame.allowTransparency = true;
        config.container.appendChild(frame);

        if (config.onLoad) {
            on(frame, "load", config.onLoad);
        }

        // set the frame URL to the proper value (we previously set it to
        // "javascript:false" to work around the IE issue mentioned above)
        if (config.usePost) {
            var form = config.container.appendChild(document.createElement('form')), input;
            form.target = frame.name;
            form.action = src;
            form.method = 'POST';
            if (typeof (config.usePost) === 'object') {
                for (var i in config.usePost) {
                    if (config.usePost.hasOwnProperty(i)) {
                        if (HAS_NAME_PROPERTY_BUG) {
                            input = document.createElement('<input name="' + i + '"/>');
                        } else {
                            input = document.createElement("INPUT");
                            input.name = i;
                        }
                        input.value = config.usePost[i];
                        form.appendChild(input);
                    }
                }
            }
            form.submit();
            form.parentNode.removeChild(form);
        } else {
            frame.src = src;
        }
        config.props.src = src;

        return frame;
    }

    /**
     * Check whether a domain is allowed using an Access Control List.
     * The ACL can contain * and ? as wildcards, or can be regular expressions.
     * If regular expressions they need to begin with ^ and end with $.
     * @param {Array/String} acl The list of allowed domains
     * @param {String} domain The domain to test.
     * @return {Boolean} True if the domain is allowed, false if not.
     */
    function checkAcl(acl, domain) {
        // normalize into an array
        if (typeof acl == "string") {
            acl = [acl];
        }
        var re, i = acl.length;
        while (i--) {
            re = acl[i];
            re = new RegExp(re.substr(0, 1) == "^" ? re : ("^" + re.replace(/(\*)/g, ".$1").replace(/\?/g, ".") + "$"));
            if (re.test(domain)) {
                return true;
            }
        }
        return false;
    }

    /*
     * Functions related to stacks
     */
    /**
     * Prepares an array of stack-elements suitable for the current configuration
     * @param {Object} config The Transports configuration. See easyXDM.Socket for more.
     * @return {Array} An array of stack-elements with the TransportElement at index 0.
     */
    function prepareTransportStack(config) {
        var protocol = config.protocol, stackEls;
        config.isHost = config.isHost || undef(query.xdm_p);
        useHash = config.hash || false;

        if (!config.props) {
            config.props = {};
        }
        if (!config.isHost) {
            config.channel = query.xdm_c.replace(/["'<>\\]/g, "");
            config.secret = query.xdm_s;
            config.remote = query.xdm_e.replace(/["'<>\\]/g, "");
            ;
            protocol = query.xdm_p;
            if (config.acl && !checkAcl(config.acl, config.remote)) {
                throw new Error("Access denied for " + config.remote);
            }
        }
        else {
            config.remote = resolveUrl(config.remote);
            config.channel = config.channel || "default" + channelId++;
            config.secret = Math.random().toString(16).substring(2);
            if (undef(protocol)) {
                if (getLocation(location.href) == getLocation(config.remote)) {
                    /*
                     * Both documents has the same origin, lets use direct access.
                     */
                    protocol = "4";
                }
                else if (isHostMethod(window, "postMessage") || isHostMethod(document, "postMessage")) {
                    /*
                     * This is supported in IE8+, Firefox 3+, Opera 9+, Chrome 2+ and Safari 4+
                     */
                    protocol = "1";
                }
                else if (config.swf && isHostMethod(window, "ActiveXObject") && hasFlash()) {
                    /*
                     * The Flash transport superseedes the NixTransport as the NixTransport has been blocked by MS
                     */
                    protocol = "6";
                }
                else if (navigator.product === "Gecko" && "frameElement" in window && navigator.userAgent.indexOf('WebKit') == -1) {
                    /*
                     * This is supported in Gecko (Firefox 1+)
                     */
                    protocol = "5";
                }
                else if (config.remoteHelper) {
                    /*
                     * This is supported in all browsers that retains the value of window.name when
                     * navigating from one domain to another, and where parent.frames[foo] can be used
                     * to get access to a frame from the same domain
                     */
                    protocol = "2";
                }
                else {
                    /*
                     * This is supported in all browsers where [window].location is writable for all
                     * The resize event will be used if resize is supported and the iframe is not put
                     * into a container, else polling will be used.
                     */
                    protocol = "0";
                }
            }
        }
        config.protocol = protocol; // for conditional branching
        switch (protocol) {
            case "0":// 0 = HashTransport
                apply(config, {
                    interval: 100,
                    delay: 2000,
                    useResize: true,
                    useParent: false,
                    usePolling: false
                }, true);
                if (config.isHost) {
                    if (!config.local) {
                        // If no local is set then we need to find an image hosted on the current domain
                        var domain = location.protocol + "//" + location.host, images = document.body.getElementsByTagName("img"), image;
                        var i = images.length;
                        while (i--) {
                            image = images[i];
                            if (image.src.substring(0, domain.length) === domain) {
                                config.local = image.src;
                                break;
                            }
                        }
                        if (!config.local) {
                            // If no local was set, and we are unable to find a suitable file, then we resort to using the current window 
                            config.local = window;
                        }
                    }

                    var parameters = {
                        xdm_c: config.channel,
                        xdm_p: 0
                    };

                    if (config.local === window) {
                        // We are using the current window to listen to
                        config.usePolling = true;
                        config.useParent = true;
                        config.local = location.protocol + "//" + location.host + location.pathname + location.search;
                        parameters.xdm_e = config.local;
                        parameters.xdm_pa = 1; // use parent
                    }
                    else {
                        parameters.xdm_e = resolveUrl(config.local);
                    }

                    if (config.container) {
                        config.useResize = false;
                        parameters.xdm_po = 1; // use polling
                    }
                    config.remote = appendQueryParameters(config.remote, parameters);
                }
                else {
                    apply(config, {
                        channel: query.xdm_c,
                        remote: query.xdm_e,
                        useParent: !undef(query.xdm_pa),
                        usePolling: !undef(query.xdm_po),
                        useResize: config.useParent ? false : config.useResize
                    });
                }
                stackEls = [new easyXDM.stack.HashTransport(config), new easyXDM.stack.ReliableBehavior({}), new easyXDM.stack.QueueBehavior({
                    encode: true,
                    maxLength: 4000 - config.remote.length
                }), new easyXDM.stack.VerifyBehavior({
                    initiate: config.isHost
                })];
                break;
            case "1":
                stackEls = [new easyXDM.stack.PostMessageTransport(config)];
                break;
            case "2":
                if (config.isHost) {
                    config.remoteHelper = resolveUrl(config.remoteHelper);
                }
                stackEls = [new easyXDM.stack.NameTransport(config), new easyXDM.stack.QueueBehavior(), new easyXDM.stack.VerifyBehavior({
                    initiate: config.isHost
                })];
                break;
            case "3":
                stackEls = [new easyXDM.stack.NixTransport(config)];
                break;
            case "4":
                stackEls = [new easyXDM.stack.SameOriginTransport(config)];
                break;
            case "5":
                stackEls = [new easyXDM.stack.FrameElementTransport(config)];
                break;
            case "6":
                if (!flashVersion) {
                    hasFlash();
                }
                stackEls = [new easyXDM.stack.FlashTransport(config)];
                break;
        }
        // this behavior is responsible for buffering outgoing messages, and for performing lazy initialization
        stackEls.push(new easyXDM.stack.QueueBehavior({
            lazy: config.lazy,
            remove: true
        }));
        return stackEls;
    }

    /**
     * Chains all the separate stack elements into a single usable stack.<br/>
     * If an element is missing a necessary method then it will have a pass-through method applied.
     * @param {Array} stackElements An array of stack elements to be linked.
     * @return {easyXDM.stack.StackElement} The last element in the chain.
     */
    function chainStack(stackElements) {
        var stackEl, defaults = {
            incoming: function (message, origin) {
                this.up.incoming(message, origin);
            },
            outgoing: function (message, recipient) {
                this.down.outgoing(message, recipient);
            },
            callback: function (success) {
                this.up.callback(success);
            },
            init: function () {
                this.down.init();
            },
            destroy: function () {
                this.down.destroy();
            }
        };
        for (var i = 0, len = stackElements.length; i < len; i++) {
            stackEl = stackElements[i];
            apply(stackEl, defaults, true);
            if (i !== 0) {
                stackEl.down = stackElements[i - 1];
            }
            if (i !== len - 1) {
                stackEl.up = stackElements[i + 1];
            }
        }
        return stackEl;
    }

    /**
     * This will remove a stackelement from its stack while leaving the stack functional.
     * @param {Object} element The elment to remove from the stack.
     */
    function removeFromStack(element) {
        element.up.down = element.down;
        element.down.up = element.up;
        element.up = element.down = null;
    }

    /*
     * Export the main object and any other methods applicable
     */
    /** 
     * @class easyXDM
     * A javascript library providing cross-browser, cross-domain messaging/RPC.
     * @version 2.4.19.3
     * @singleton
     */
    apply(easyXDM, {
        /**
         * The version of the library
         * @type {string}
         */
        version: "2.4.19.3",
        /**
         * This is a map containing all the query parameters passed to the document.
         * All the values has been decoded using decodeURIComponent.
         * @type {object}
         */
        query: query,
        /**
         * @private
         */
        stack: {},
        /**
         * Applies properties from the source object to the target object.<br/>
         * @param {object} target The target of the properties.
         * @param {object} source The source of the properties.
         * @param {boolean} noOverwrite Set to True to only set non-existing properties.
         */
        apply: apply,

        /**
         * A safe implementation of HTML5 JSON. Feature testing is used to make sure the implementation works.
         * @return {JSON} A valid JSON conforming object, or null if not found.
         */
        getJSONObject: getJSON,
        /**
         * This will add a function to the queue of functions to be run once the DOM reaches a ready state.
         * If functions are added after this event then they will be executed immediately.
         * @param {function} fn The function to add
         * @param {object} scope An optional scope for the function to be called with.
         */
        whenReady: whenReady,
        /**
         * Removes easyXDM variable from the global scope. It also returns control
         * of the easyXDM variable to whatever code used it before.
         *
         * @param {String} ns A string representation of an object that will hold
         *                    an instance of easyXDM.
         * @return An instance of easyXDM
         */
        noConflict: noConflict
    });

    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global console, _FirebugCommandLine,  easyXDM, window, escape, unescape, isHostObject, undef, _trace, domIsReady, emptyFn, namespace */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, isHostObject, isHostMethod, un, on, createFrame, debug */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /** 
     * @class easyXDM.DomHelper
     * Contains methods for dealing with the DOM
     * @singleton
     */
    easyXDM.DomHelper = {
        /**
         * Provides a consistent interface for adding eventhandlers
         * @param {Object} target The target to add the event to
         * @param {String} type The name of the event
         * @param {Function} listener The listener
         */
        on: on,
        /**
         * Provides a consistent interface for removing eventhandlers
         * @param {Object} target The target to remove the event from
         * @param {String} type The name of the event
         * @param {Function} listener The listener
         */
        un: un,
        /**
         * Checks for the presence of the JSON object.
         * If it is not present it will use the supplied path to load the JSON2 library.
         * This should be called in the documents head right after the easyXDM script tag.
         * http://json.org/json2.js
         * @param {String} path A valid path to json2.js
         */
        requiresJSON: function (path) {
            if (!isHostObject(window, "JSON")) {
                // we need to encode the < in order to avoid an illegal token error
                // when the script is inlined in a document.
                document.write('<' + 'script type="text/javascript" src="' + path + '"><' + '/script>');
            }
        }
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, debug */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    (function () {
        // The map containing the stored functions
        var _map = {};

        /**
         * @class easyXDM.Fn
         * This contains methods related to function handling, such as storing callbacks.
         * @singleton
         * @namespace easyXDM
         */
        easyXDM.Fn = {
            /**
             * Stores a function using the given name for reference
             * @param {String} name The name that the function should be referred by
             * @param {Function} fn The function to store
             * @namespace easyXDM.fn
             */
            set: function (name, fn) {
                _map[name] = fn;
            },
            /**
             * Retrieves the function referred to by the given name
             * @param {String} name The name of the function to retrieve
             * @param {Boolean} del If the function should be deleted after retrieval
             * @return {Function} The stored function
             * @namespace easyXDM.fn
             */
            get: function (name, del) {
                if (!_map.hasOwnProperty(name)) {
                    return;
                }
                var fn = _map[name];

                if (del) {
                    delete _map[name];
                }
                return fn;
            }
        };

    }());
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, chainStack, prepareTransportStack, getLocation, debug */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.Socket
     * This class creates a transport channel between two domains that is usable for sending and receiving string-based messages.<br/>
     * The channel is reliable, supports queueing, and ensures that the message originates from the expected domain.<br/>
     * Internally different stacks will be used depending on the browsers features and the available parameters.
     * <h2>How to set up</h2>
     * Setting up the provider:
     * <pre><code>
     * var socket = new easyXDM.Socket({
     * &nbsp; local: "name.html",
     * &nbsp; onReady: function(){
     * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the socket
     * &nbsp; &nbsp; socket.postMessage("foo-message");
     * &nbsp; },
     * &nbsp; onMessage: function(message, origin) {
     * &nbsp;&nbsp; alert("received " + message + " from " + origin);
     * &nbsp; }
     * });
     * </code></pre>
     * Setting up the consumer:
     * <pre><code>
     * var socket = new easyXDM.Socket({
     * &nbsp; remote: "http:&#47;&#47;remotedomain/page.html",
     * &nbsp; remoteHelper: "http:&#47;&#47;remotedomain/name.html",
     * &nbsp; onReady: function(){
     * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the socket
     * &nbsp; &nbsp; socket.postMessage("foo-message");
     * &nbsp; },
     * &nbsp; onMessage: function(message, origin) {
     * &nbsp;&nbsp; alert("received " + message + " from " + origin);
     * &nbsp; }
     * });
     * </code></pre>
     * If you are unable to upload the <code>name.html</code> file to the consumers domain then remove the <code>remoteHelper</code> property
     * and easyXDM will fall back to using the HashTransport instead of the NameTransport when not able to use any of the primary transports.
     * @namespace easyXDM
     * @constructor
     * @cfg {String/Window} local The url to the local name.html document, a local static file, or a reference to the local window.
     * @cfg {Boolean} lazy (Consumer only) Set this to true if you want easyXDM to defer creating the transport until really needed. 
     * @cfg {String} remote (Consumer only) The url to the providers document.
     * @cfg {String} remoteHelper (Consumer only) The url to the remote name.html file. This is to support NameTransport as a fallback. Optional.
     * @cfg {Number} delay The number of milliseconds easyXDM should try to get a reference to the local window.  Optional, defaults to 2000.
     * @cfg {Number} interval The interval used when polling for messages. Optional, defaults to 300.
     * @cfg {String} channel (Consumer only) The name of the channel to use. Can be used to set consistent iframe names. Must be unique. Optional.
     * @cfg {Function} onMessage The method that should handle incoming messages.<br/> This method should accept two arguments, the message as a string, and the origin as a string. Optional.
     * @cfg {Function} onReady A method that should be called when the transport is ready. Optional.
     * @cfg {DOMElement|String} container (Consumer only) The element, or the id of the element that the primary iframe should be inserted into. If not set then the iframe will be positioned off-screen. Optional.
     * @cfg {Array/String} acl (Provider only) Here you can specify which '[protocol]://[domain]' patterns that should be allowed to act as the consumer towards this provider.<br/>
     * This can contain the wildcards ? and *.  Examples are 'http://example.com', '*.foo.com' and '*dom?.com'. If you want to use reqular expressions then you pattern needs to start with ^ and end with $.
     * If none of the patterns match an Error will be thrown.  
     * @cfg {Object} props (Consumer only) Additional properties that should be applied to the iframe. This can also contain nested objects e.g: <code>{style:{width:"100px", height:"100px"}}</code>. 
     * Properties such as 'name' and 'src' will be overrided. Optional.
     */
    easyXDM.Socket = function (config) {

        // create the stack
        var stack = chainStack(prepareTransportStack(config).concat([{
            incoming: function (message, origin) {
                config.onMessage(message, origin);
            },
            callback: function (success) {
                if (config.onReady) {
                    config.onReady(success);
                }
            }
        }])), recipient = getLocation(config.remote);

        // set the origin
        this.origin = getLocation(config.remote);

        /**
         * Initiates the destruction of the stack.
         */
        this.destroy = function () {
            stack.destroy();
        };

        /**
         * Posts a message to the remote end of the channel
         * @param {String} message The message to send
         */
        this.postMessage = function (message) {
            stack.outgoing(message, recipient);
        };

        stack.init();
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, undef,, chainStack, prepareTransportStack, debug, getLocation */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /** 
     * @class easyXDM.Rpc
     * Creates a proxy object that can be used to call methods implemented on the remote end of the channel, and also to provide the implementation
     * of methods to be called from the remote end.<br/>
     * The instantiated object will have methods matching those specified in <code>config.remote</code>.<br/>
     * This requires the JSON object present in the document, either natively, using json.org's json2 or as a wrapper around library spesific methods.
     * <h2>How to set up</h2>
     * <pre><code>
     * var rpc = new easyXDM.Rpc({
     * &nbsp; &#47;&#47; this configuration is equal to that used by the Socket.
     * &nbsp; remote: "http:&#47;&#47;remotedomain/...",
     * &nbsp; onReady: function(){
     * &nbsp; &nbsp; &#47;&#47; you need to wait for the onReady callback before using the proxy
     * &nbsp; &nbsp; rpc.foo(...
     * &nbsp; }
     * },{
     * &nbsp; local: {..},
     * &nbsp; remote: {..}
     * });
     * </code></pre>
     * 
     * <h2>Exposing functions (procedures)</h2>
     * <pre><code>
     * var rpc = new easyXDM.Rpc({
     * &nbsp; ...
     * },{
     * &nbsp; local: {
     * &nbsp; &nbsp; nameOfMethod: {
     * &nbsp; &nbsp; &nbsp; method: function(arg1, arg2, success, error){
     * &nbsp; &nbsp; &nbsp; &nbsp; ...
     * &nbsp; &nbsp; &nbsp; }
     * &nbsp; &nbsp; },
     * &nbsp; &nbsp; &#47;&#47; with shorthand notation 
     * &nbsp; &nbsp; nameOfAnotherMethod:  function(arg1, arg2, success, error){
     * &nbsp; &nbsp; }
     * &nbsp; },
     * &nbsp; remote: {...}
     * });
     * </code></pre>
    
     * The function referenced by  [method] will receive the passed arguments followed by the callback functions <code>success</code> and <code>error</code>.<br/>
     * To send a successfull result back you can use
     *     <pre><code>
     *     return foo;
     *     </pre></code>
     * or
     *     <pre><code>
     *     success(foo);
     *     </pre></code>
     *  To return an error you can use
     *     <pre><code>
     *     throw new Error("foo error");
     *     </code></pre>
     * or
     *     <pre><code>
     *     error("foo error");
     *     </code></pre>
     *
     * <h2>Defining remotely exposed methods (procedures/notifications)</h2>
     * The definition of the remote end is quite similar:
     * <pre><code>
     * var rpc = new easyXDM.Rpc({
     * &nbsp; ...
     * },{
     * &nbsp; local: {...},
     * &nbsp; remote: {
     * &nbsp; &nbsp; nameOfMethod: {}
     * &nbsp; }
     * });
     * </code></pre>
     * To call a remote method use
     * <pre><code>
     * rpc.nameOfMethod("arg1", "arg2", function(value) {
     * &nbsp; alert("success: " + value);
     * }, function(message) {
     * &nbsp; alert("error: " + message + );
     * });
     * </code></pre>
     * Both the <code>success</code> and <code>errror</code> callbacks are optional.<br/>
     * When called with no callback a JSON-RPC 2.0 notification will be executed.
     * Be aware that you will not be notified of any errors with this method.
     * <br/>
     * <h2>Specifying a custom serializer</h2>
     * If you do not want to use the JSON2 library for non-native JSON support, but instead capabilities provided by some other library
     * then you can specify a custom serializer using <code>serializer: foo</code>
     * <pre><code>
     * var rpc = new easyXDM.Rpc({
     * &nbsp; ...
     * },{
     * &nbsp; local: {...},
     * &nbsp; remote: {...},
     * &nbsp; serializer : {
     * &nbsp; &nbsp; parse: function(string){ ... },
     * &nbsp; &nbsp; stringify: function(object) {...}
     * &nbsp; }
     * });
     * </code></pre>
     * If <code>serializer</code> is set then the class will not attempt to use the native implementation.
     * @namespace easyXDM
     * @constructor
     * @param {Object} config The underlying transports configuration. See easyXDM.Socket for available parameters.
     * @param {Object} jsonRpcConfig The description of the interface to implement.
     */
    easyXDM.Rpc = function (config, jsonRpcConfig) {

        // expand shorthand notation
        if (jsonRpcConfig.local) {
            for (var method in jsonRpcConfig.local) {
                if (jsonRpcConfig.local.hasOwnProperty(method)) {
                    var member = jsonRpcConfig.local[method];
                    if (typeof member === "function") {
                        jsonRpcConfig.local[method] = {
                            method: member
                        };
                    }
                }
            }
        }

        // create the stack
        var stack = chainStack(prepareTransportStack(config).concat([new easyXDM.stack.RpcBehavior(this, jsonRpcConfig), {
            callback: function (success) {
                if (config.onReady) {
                    config.onReady(success);
                }
            }
        }]));

        // set the origin 
        this.origin = getLocation(config.remote);


        /**
         * Initiates the destruction of the stack.
         */
        this.destroy = function () {
            stack.destroy();
        };

        stack.init();
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, apply, whenReady, getParentObject, IFRAME_PREFIX*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.SameOriginTransport
     * SameOriginTransport is a transport class that can be used when both domains have the same origin.<br/>
     * This can be useful for testing and for when the main application supports both internal and external sources.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String} remote The remote document to communicate with.
     */
    easyXDM.stack.SameOriginTransport = function (config) {
        var pub, frame, send, targetOrigin;

        return (pub = {
            outgoing: function (message, domain, fn) {
                send(message);
                if (fn) {
                    fn();
                }
            },
            destroy: function () {
                if (frame) {
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },
            onDOMReady: function () {
                targetOrigin = getLocation(config.remote);

                if (config.isHost) {
                    // set up the iframe
                    apply(config.props, {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: location.protocol + "//" + location.host + location.pathname,
                            xdm_c: config.channel,
                            xdm_p: 4 // 4 = SameOriginTransport
                        }),
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    frame = createFrame(config);
                    easyXDM.Fn.set(config.channel, function (sendFn) {
                        send = sendFn;
                        setTimeout(function () {
                            pub.up.callback(true);
                        }, 0);
                        return function (msg) {
                            pub.up.incoming(msg, targetOrigin);
                        };
                    });
                }
                else {
                    send = getParentObject().Fn.get(config.channel, true)(function (msg) {
                        pub.up.incoming(msg, targetOrigin);
                    });
                    setTimeout(function () {
                        pub.up.callback(true);
                    }, 0);
                }
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global global, easyXDM, window, getLocation, appendQueryParameters, createFrame, debug, apply, whenReady, IFRAME_PREFIX, namespace, resolveUrl, getDomainName, HAS_FLASH_THROTTLED_BUG, getPort, query*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.FlashTransport
     * FlashTransport is a transport class that uses an SWF with LocalConnection to pass messages back and forth.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String} remote The remote domain to communicate with.
     * @cfg {String} secret the pre-shared secret used to secure the communication.
     * @cfg {String} swf The path to the swf file
     * @cfg {Boolean} swfNoThrottle Set this to true if you want to take steps to avoid beeing throttled when hidden.
     * @cfg {String || DOMElement} swfContainer Set this if you want to control where the swf is placed
     */
    easyXDM.stack.FlashTransport = function (config) {
        var pub, // the public interface
     frame, send, targetOrigin, swf, swfContainer;

        function onMessage(message, origin) {
            setTimeout(function () {
                pub.up.incoming(message, targetOrigin);
            }, 0);
        }

        /**
         * This method adds the SWF to the DOM and prepares the initialization of the channel
         */
        function addSwf(domain) {
            // the differentiating query argument is needed in Flash9 to avoid a caching issue where LocalConnection would throw an error.
            var url = config.swf + "?host=" + config.isHost;
            var id = "easyXDM_swf_" + Math.floor(Math.random() * 10000);

            // prepare the init function that will fire once the swf is ready
            easyXDM.Fn.set("flash_loaded" + domain.replace(/[\-.]/g, "_"), function () {
                easyXDM.stack.FlashTransport[domain].swf = swf = swfContainer.firstChild;
                var queue = easyXDM.stack.FlashTransport[domain].queue;
                for (var i = 0; i < queue.length; i++) {
                    queue[i]();
                }
                queue.length = 0;
            });

            if (config.swfContainer) {
                swfContainer = (typeof config.swfContainer == "string") ? document.getElementById(config.swfContainer) : config.swfContainer;
            }
            else {
                // create the container that will hold the swf
                swfContainer = document.createElement('div');

                // http://bugs.adobe.com/jira/browse/FP-4796
                // http://tech.groups.yahoo.com/group/flexcoders/message/162365
                // https://groups.google.com/forum/#!topic/easyxdm/mJZJhWagoLc
                apply(swfContainer.style, HAS_FLASH_THROTTLED_BUG && config.swfNoThrottle ? {
                    height: "20px",
                    width: "20px",
                    position: "fixed",
                    right: 0,
                    top: 0
                } : {
                    height: "1px",
                    width: "1px",
                    position: "absolute",
                    overflow: "hidden",
                    right: 0,
                    top: 0
                });
                document.body.appendChild(swfContainer);
            }

            // create the object/embed
            var flashVars = "callback=flash_loaded" + encodeURIComponent(domain.replace(/[\-.]/g, "_"))
                + "&proto=" + global.location.protocol
                + "&domain=" + encodeURIComponent(getDomainName(global.location.href))
                + "&port=" + encodeURIComponent(getPort(global.location.href))
                + "&ns=" + encodeURIComponent(namespace);
            swfContainer.innerHTML = "<object height='20' width='20' type='application/x-shockwave-flash' id='" + id + "' data='" + url + "'>" +
            "<param name='allowScriptAccess' value='always'></param>" +
            "<param name='wmode' value='transparent'>" +
            "<param name='movie' value='" +
            url +
            "'></param>" +
            "<param name='flashvars' value='" +
            flashVars +
            "'></param>" +
            "<embed type='application/x-shockwave-flash' FlashVars='" +
            flashVars +
            "' allowScriptAccess='always' wmode='transparent' src='" +
            url +
            "' height='1' width='1'></embed>" +
            "</object>";
        }

        return (pub = {
            outgoing: function (message, domain, fn) {
                swf.postMessage(config.channel, message.toString());
                if (fn) {
                    fn();
                }
            },
            destroy: function () {
                try {
                    swf.destroyChannel(config.channel);
                }
                catch (e) {
                }
                swf = null;
                if (frame) {
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },
            onDOMReady: function () {

                targetOrigin = config.remote;

                // Prepare the code that will be run after the swf has been intialized
                easyXDM.Fn.set("flash_" + config.channel + "_init", function () {
                    setTimeout(function () {
                        pub.up.callback(true);
                    });
                });

                // set up the omMessage handler
                easyXDM.Fn.set("flash_" + config.channel + "_onMessage", onMessage);

                config.swf = resolveUrl(config.swf); // reports have been made of requests gone rogue when using relative paths
                var swfdomain = getDomainName(config.swf);
                var fn = function () {
                    // set init to true in case the fn was called was invoked from a separate instance
                    easyXDM.stack.FlashTransport[swfdomain].init = true;
                    swf = easyXDM.stack.FlashTransport[swfdomain].swf;
                    // create the channel
                    swf.createChannel(config.channel, config.secret, getLocation(config.remote), config.isHost);

                    if (config.isHost) {
                        // if Flash is going to be throttled and we want to avoid this
                        if (HAS_FLASH_THROTTLED_BUG && config.swfNoThrottle) {
                            apply(config.props, {
                                position: "fixed",
                                right: 0,
                                top: 0,
                                height: "20px",
                                width: "20px"
                            });
                        }
                        // set up the iframe
                        apply(config.props, {
                            src: appendQueryParameters(config.remote, {
                                xdm_e: getLocation(location.href),
                                xdm_c: config.channel,
                                xdm_p: 6, // 6 = FlashTransport
                                xdm_s: config.secret
                            }),
                            name: IFRAME_PREFIX + config.channel + "_provider"
                        });
                        frame = createFrame(config);
                    }
                };

                if (easyXDM.stack.FlashTransport[swfdomain] && easyXDM.stack.FlashTransport[swfdomain].init) {
                    // if the swf is in place and we are the consumer
                    fn();
                }
                else {
                    // if the swf does not yet exist
                    if (!easyXDM.stack.FlashTransport[swfdomain]) {
                        // add the queue to hold the init fn's
                        easyXDM.stack.FlashTransport[swfdomain] = {
                            queue: [fn]
                        };
                        addSwf(swfdomain);
                    }
                    else {
                        easyXDM.stack.FlashTransport[swfdomain].queue.push(fn);
                    }
                }
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, un, on, apply, whenReady, IFRAME_PREFIX*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.PostMessageTransport
     * PostMessageTransport is a transport class that uses HTML5 postMessage for communication.<br/>
     * <a href="http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx">http://msdn.microsoft.com/en-us/library/ms644944(VS.85).aspx</a><br/>
     * <a href="https://developer.mozilla.org/en/DOM/window.postMessage">https://developer.mozilla.org/en/DOM/window.postMessage</a>
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String} remote The remote domain to communicate with.
     */
    easyXDM.stack.PostMessageTransport = function (config) {
        var pub, // the public interface
     frame, // the remote frame, if any
     callerWindow, // the window that we will call with
     targetOrigin; // the domain to communicate with
        /**
         * Resolves the origin from the event object
         * @private
         * @param {Object} event The messageevent
         * @return {String} The scheme, host and port of the origin
         */
        function _getOrigin(event) {
            if (event.origin) {
                // This is the HTML5 property
                return getLocation(event.origin);
            }
            if (event.uri) {
                // From earlier implementations 
                return getLocation(event.uri);
            }
            if (event.domain) {
                // This is the last option and will fail if the 
                // origin is not using the same schema as we are
                return location.protocol + "//" + event.domain;
            }
            throw "Unable to retrieve the origin of the event";
        }

        /**
         * This is the main implementation for the onMessage event.<br/>
         * It checks the validity of the origin and passes the message on if appropriate.
         * @private
         * @param {Object} event The messageevent
         */
        function _window_onMessage(event) {
            var origin = _getOrigin(event);
            if (origin == targetOrigin && event.data.substring(0, config.channel.length + 1) == config.channel + " ") {
                pub.up.incoming(event.data.substring(config.channel.length + 1), origin);
            }
        }

        return (pub = {
            outgoing: function (message, domain, fn) {
                callerWindow.postMessage(config.channel + " " + message, domain || targetOrigin);
                if (fn) {
                    fn();
                }
            },
            destroy: function () {
                un(window, "message", _window_onMessage);
                if (frame) {
                    callerWindow = null;
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },
            onDOMReady: function () {
                targetOrigin = getLocation(config.remote);
                if (config.isHost) {
                    // add the event handler for listening
                    var waitForReady = function (event) {
                        if (event.data == config.channel + "-ready") {
                            // replace the eventlistener
                            callerWindow = ("postMessage" in frame.contentWindow) ? frame.contentWindow : frame.contentWindow.document;
                            un(window, "message", waitForReady);
                            on(window, "message", _window_onMessage);
                            setTimeout(function () {
                                pub.up.callback(true);
                            }, 0);
                        }
                    };
                    on(window, "message", waitForReady);

                    // set up the iframe
                    apply(config.props, {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: getLocation(location.href),
                            xdm_c: config.channel,
                            xdm_p: 1 // 1 = PostMessage
                        }),
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    frame = createFrame(config);
                }
                else {
                    // add the event handler for listening
                    on(window, "message", _window_onMessage);
                    callerWindow = ("postMessage" in window.parent) ? window.parent : window.parent.document;
                    callerWindow.postMessage(config.channel + "-ready", targetOrigin);

                    setTimeout(function () {
                        pub.up.callback(true);
                    }, 0);
                }
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, getLocation, appendQueryParameters, createFrame, debug, apply, query, whenReady, IFRAME_PREFIX*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.FrameElementTransport
     * FrameElementTransport is a transport class that can be used with Gecko-browser as these allow passing variables using the frameElement property.<br/>
     * Security is maintained as Gecho uses Lexical Authorization to determine under which scope a function is running.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String} remote The remote document to communicate with.
     */
    easyXDM.stack.FrameElementTransport = function (config) {
        var pub, frame, send, targetOrigin;

        return (pub = {
            outgoing: function (message, domain, fn) {
                send.call(this, message);
                if (fn) {
                    fn();
                }
            },
            destroy: function () {
                if (frame) {
                    frame.parentNode.removeChild(frame);
                    frame = null;
                }
            },
            onDOMReady: function () {
                targetOrigin = getLocation(config.remote);

                if (config.isHost) {
                    // set up the iframe
                    apply(config.props, {
                        src: appendQueryParameters(config.remote, {
                            xdm_e: getLocation(location.href),
                            xdm_c: config.channel,
                            xdm_p: 5 // 5 = FrameElementTransport
                        }),
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    frame = createFrame(config);
                    frame.fn = function (sendFn) {
                        delete frame.fn;
                        send = sendFn;
                        setTimeout(function () {
                            pub.up.callback(true);
                        }, 0);
                        // remove the function so that it cannot be used to overwrite the send function later on
                        return function (msg) {
                            pub.up.incoming(msg, targetOrigin);
                        };
                    };
                }
                else {
                    // This is to mitigate origin-spoofing
                    if (document.referrer && getLocation(document.referrer) != query.xdm_e) {
                        window.top.location = query.xdm_e;
                    }
                    send = window.frameElement.fn(function (msg) {
                        pub.up.incoming(msg, targetOrigin);
                    });
                    pub.up.callback(true);
                }
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, undef, getLocation, appendQueryParameters, resolveUrl, createFrame, debug, un, apply, whenReady, IFRAME_PREFIX*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.NameTransport
     * NameTransport uses the window.name property to relay data.
     * The <code>local</code> parameter needs to be set on both the consumer and provider,<br/>
     * and the <code>remoteHelper</code> parameter needs to be set on the consumer.
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String} remoteHelper The url to the remote instance of hash.html - this is only needed for the host.
     * @namespace easyXDM.stack
     */
    easyXDM.stack.NameTransport = function (config) {

        var pub; // the public interface
        var isHost, callerWindow, remoteWindow, readyCount, callback, remoteOrigin, remoteUrl;

        function _sendMessage(message) {
            var url = config.remoteHelper + (isHost ? "#_3" : "#_2") + config.channel;
            callerWindow.contentWindow.sendMessage(message, url);
        }

        function _onReady() {
            if (isHost) {
                if (++readyCount === 2 || !isHost) {
                    pub.up.callback(true);
                }
            }
            else {
                _sendMessage("ready");
                pub.up.callback(true);
            }
        }

        function _onMessage(message) {
            pub.up.incoming(message, remoteOrigin);
        }

        function _onLoad() {
            if (callback) {
                setTimeout(function () {
                    callback(true);
                }, 0);
            }
        }

        return (pub = {
            outgoing: function (message, domain, fn) {
                callback = fn;
                _sendMessage(message);
            },
            destroy: function () {
                callerWindow.parentNode.removeChild(callerWindow);
                callerWindow = null;
                if (isHost) {
                    remoteWindow.parentNode.removeChild(remoteWindow);
                    remoteWindow = null;
                }
            },
            onDOMReady: function () {
                isHost = config.isHost;
                readyCount = 0;
                remoteOrigin = getLocation(config.remote);
                config.local = resolveUrl(config.local);

                if (isHost) {
                    // Register the callback
                    easyXDM.Fn.set(config.channel, function (message) {
                        if (isHost && message === "ready") {
                            // Replace the handler
                            easyXDM.Fn.set(config.channel, _onMessage);
                            _onReady();
                        }
                    });

                    // Set up the frame that points to the remote instance
                    remoteUrl = appendQueryParameters(config.remote, {
                        xdm_e: config.local,
                        xdm_c: config.channel,
                        xdm_p: 2
                    });
                    apply(config.props, {
                        src: remoteUrl + '#' + config.channel,
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    remoteWindow = createFrame(config);
                }
                else {
                    config.remoteHelper = config.remote;
                    easyXDM.Fn.set(config.channel, _onMessage);
                }

                // Set up the iframe that will be used for the transport
                var onLoad = function () {
                    // Remove the handler
                    var w = callerWindow || this;
                    un(w, "load", onLoad);
                    easyXDM.Fn.set(config.channel + "_load", _onLoad);
                    (function test() {
                        if (typeof w.contentWindow.sendMessage == "function") {
                            _onReady();
                        }
                        else {
                            setTimeout(test, 50);
                        }
                    }());
                };

                callerWindow = createFrame({
                    props: {
                        src: config.local + "#_4" + config.channel
                    },
                    onLoad: onLoad
                });
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, getLocation, createFrame, debug, un, on, apply, whenReady, IFRAME_PREFIX*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.HashTransport
     * HashTransport is a transport class that uses the IFrame URL Technique for communication.<br/>
     * <a href="http://msdn.microsoft.com/en-us/library/bb735305.aspx">http://msdn.microsoft.com/en-us/library/bb735305.aspx</a><br/>
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The transports configuration.
     * @cfg {String/Window} local The url to the local file used for proxying messages, or the local window.
     * @cfg {Number} delay The number of milliseconds easyXDM should try to get a reference to the local window.
     * @cfg {Number} interval The interval used when polling for messages.
     */
    easyXDM.stack.HashTransport = function (config) {
        var pub;
        var me = this, isHost, _timer, pollInterval, _lastMsg, _msgNr, _listenerWindow, _callerWindow;
        var useParent, _remoteOrigin;

        function _sendMessage(message) {
            if (!_callerWindow) {
                return;
            }
            var url = config.remote + "#" + (_msgNr++) + "_" + message;
            ((isHost || !useParent) ? _callerWindow.contentWindow : _callerWindow).location = url;
        }

        function _handleHash(hash) {
            _lastMsg = hash;
            pub.up.incoming(_lastMsg.substring(_lastMsg.indexOf("_") + 1), _remoteOrigin);
        }

        /**
         * Checks location.hash for a new message and relays this to the receiver.
         * @private
         */
        function _pollHash() {
            if (!_listenerWindow) {
                return;
            }
            var href = _listenerWindow.location.href, hash = "", indexOf = href.indexOf("#");
            if (indexOf != -1) {
                hash = href.substring(indexOf);
            }
            if (hash && hash != _lastMsg) {
                _handleHash(hash);
            }
        }

        function _attachListeners() {
            _timer = setInterval(_pollHash, pollInterval);
        }

        return (pub = {
            outgoing: function (message, domain) {
                _sendMessage(message);
            },
            destroy: function () {
                window.clearInterval(_timer);
                if (isHost || !useParent) {
                    _callerWindow.parentNode.removeChild(_callerWindow);
                }
                _callerWindow = null;
            },
            onDOMReady: function () {
                isHost = config.isHost;
                pollInterval = config.interval;
                _lastMsg = "#" + config.channel;
                _msgNr = 0;
                useParent = config.useParent;
                _remoteOrigin = getLocation(config.remote);
                if (isHost) {
                    apply(config.props, {
                        src: config.remote,
                        name: IFRAME_PREFIX + config.channel + "_provider"
                    });
                    if (useParent) {
                        config.onLoad = function () {
                            _listenerWindow = window;
                            _attachListeners();
                            pub.up.callback(true);
                        };
                    }
                    else {
                        var tries = 0, max = config.delay / 50;
                        (function getRef() {
                            if (++tries > max) {
                                throw new Error("Unable to reference listenerwindow");
                            }
                            try {
                                _listenerWindow = _callerWindow.contentWindow.frames[IFRAME_PREFIX + config.channel + "_consumer"];
                            }
                            catch (ex) {
                            }
                            if (_listenerWindow) {
                                _attachListeners();
                                pub.up.callback(true);
                            }
                            else {
                                setTimeout(getRef, 50);
                            }
                        }());
                    }
                    _callerWindow = createFrame(config);
                }
                else {
                    _listenerWindow = window;
                    _attachListeners();
                    if (useParent) {
                        _callerWindow = parent;
                        pub.up.callback(true);
                    }
                    else {
                        apply(config, {
                            props: {
                                src: config.remote + "#" + config.channel + new Date(),
                                name: IFRAME_PREFIX + config.channel + "_consumer"
                            },
                            onLoad: function () {
                                pub.up.callback(true);
                            }
                        });
                        _callerWindow = createFrame(config);
                    }
                }
            },
            init: function () {
                whenReady(pub.onDOMReady, pub);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, debug */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.ReliableBehavior
     * This is a behavior that tries to make the underlying transport reliable by using acknowledgements.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The behaviors configuration.
     */
    easyXDM.stack.ReliableBehavior = function (config) {
        var pub, // the public interface
     callback; // the callback to execute when we have a confirmed success/failure
        var idOut = 0, idIn = 0, currentMessage = "";

        return (pub = {
            incoming: function (message, origin) {
                var indexOf = message.indexOf("_"), ack = message.substring(0, indexOf).split(",");
                message = message.substring(indexOf + 1);

                if (ack[0] == idOut) {
                    currentMessage = "";
                    if (callback) {
                        callback(true);
                    }
                }
                if (message.length > 0) {
                    pub.down.outgoing(ack[1] + "," + idOut + "_" + currentMessage, origin);
                    if (idIn != ack[1]) {
                        idIn = ack[1];
                        pub.up.incoming(message, origin);
                    }
                }

            },
            outgoing: function (message, origin, fn) {
                currentMessage = message;
                callback = fn;
                pub.down.outgoing(idIn + "," + (++idOut) + "_" + message, origin);
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, debug, undef, removeFromStack*/
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.QueueBehavior
     * This is a behavior that enables queueing of messages. <br/>
     * It will buffer incoming messages and dispach these as fast as the underlying transport allows.
     * This will also fragment/defragment messages so that the outgoing message is never bigger than the
     * set length.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The behaviors configuration. Optional.
     * @cfg {Number} maxLength The maximum length of each outgoing message. Set this to enable fragmentation.
     */
    easyXDM.stack.QueueBehavior = function (config) {
        var pub, queue = [], waiting = true, incoming = "", destroying, maxLength = 0, lazy = false, doFragment = false;

        function dispatch() {
            if (config.remove && queue.length === 0) {
                removeFromStack(pub);
                return;
            }
            if (waiting || queue.length === 0 || destroying) {
                return;
            }
            waiting = true;
            var message = queue.shift();

            pub.down.outgoing(message.data, message.origin, function (success) {
                waiting = false;
                if (message.callback) {
                    setTimeout(function () {
                        message.callback(success);
                    }, 0);
                }
                dispatch();
            });
        }
        return (pub = {
            init: function () {
                if (undef(config)) {
                    config = {};
                }
                if (config.maxLength) {
                    maxLength = config.maxLength;
                    doFragment = true;
                }
                if (config.lazy) {
                    lazy = true;
                }
                else {
                    pub.down.init();
                }
            },
            callback: function (success) {
                waiting = false;
                var up = pub.up; // in case dispatch calls removeFromStack
                dispatch();
                up.callback(success);
            },
            incoming: function (message, origin) {
                if (doFragment) {
                    var indexOf = message.indexOf("_"), seq = parseInt(message.substring(0, indexOf), 10);
                    incoming += message.substring(indexOf + 1);
                    if (seq === 0) {
                        if (config.encode) {
                            incoming = decodeURIComponent(incoming);
                        }
                        pub.up.incoming(incoming, origin);
                        incoming = "";
                    }
                }
                else {
                    pub.up.incoming(message, origin);
                }
            },
            outgoing: function (message, origin, fn) {
                if (config.encode) {
                    message = encodeURIComponent(message);
                }
                var fragments = [], fragment;
                if (doFragment) {
                    // fragment into chunks
                    while (message.length !== 0) {
                        fragment = message.substring(0, maxLength);
                        message = message.substring(fragment.length);
                        fragments.push(fragment);
                    }
                    // enqueue the chunks
                    while ((fragment = fragments.shift())) {
                        queue.push({
                            data: fragments.length + "_" + fragment,
                            origin: origin,
                            callback: fragments.length === 0 ? fn : null
                        });
                    }
                }
                else {
                    queue.push({
                        data: message,
                        origin: origin,
                        callback: fn
                    });
                }
                if (lazy) {
                    pub.down.init();
                }
                else {
                    dispatch();
                }
            },
            destroy: function () {
                destroying = true;
                pub.down.destroy();
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, undef, debug */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.VerifyBehavior
     * This behavior will verify that communication with the remote end is possible, and will also sign all outgoing,
     * and verify all incoming messages. This removes the risk of someone hijacking the iframe to send malicious messages.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} config The behaviors configuration.
     * @cfg {Boolean} initiate If the verification should be initiated from this end.
     */
    easyXDM.stack.VerifyBehavior = function (config) {
        var pub, mySecret, theirSecret, verified = false;

        function startVerification() {
            mySecret = Math.random().toString(16).substring(2);
            pub.down.outgoing(mySecret);
        }

        return (pub = {
            incoming: function (message, origin) {
                var indexOf = message.indexOf("_");
                if (indexOf === -1) {
                    if (message === mySecret) {
                        pub.up.callback(true);
                    }
                    else if (!theirSecret) {
                        theirSecret = message;
                        if (!config.initiate) {
                            startVerification();
                        }
                        pub.down.outgoing(message);
                    }
                }
                else {
                    if (message.substring(0, indexOf) === theirSecret) {
                        pub.up.incoming(message.substring(indexOf + 1), origin);
                    }
                }
            },
            outgoing: function (message, origin, fn) {
                pub.down.outgoing(mySecret + "_" + message, origin, fn);
            },
            callback: function (success) {
                if (config.initiate) {
                    startVerification();
                }
            }
        });
    };
    /*jslint evil: true, browser: true, immed: true, passfail: true, undef: true, newcap: true*/
    /*global easyXDM, window, escape, unescape, undef, getJSON, debug, emptyFn, isArray */
    //
    // easyXDM
    // http://easyxdm.net/
    // Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.
    //

    /**
     * @class easyXDM.stack.RpcBehavior
     * This uses JSON-RPC 2.0 to expose local methods and to invoke remote methods and have responses returned over the the string based transport stack.<br/>
     * Exposed methods can return values synchronous, asyncronous, or bet set up to not return anything.
     * @namespace easyXDM.stack
     * @constructor
     * @param {Object} proxy The object to apply the methods to.
     * @param {Object} config The definition of the local and remote interface to implement.
     * @cfg {Object} local The local interface to expose.
     * @cfg {Object} remote The remote methods to expose through the proxy.
     * @cfg {Object} serializer The serializer to use for serializing and deserializing the JSON. Should be compatible with the HTML5 JSON object. Optional, will default to JSON.
     */
    easyXDM.stack.RpcBehavior = function (proxy, config) {
        var pub, serializer = config.serializer || getJSON();
        var _callbackCounter = 0, _callbacks = {};

        /**
         * Serializes and sends the message
         * @private
         * @param {Object} data The JSON-RPC message to be sent. The jsonrpc property will be added.
         */
        function _send(data) {
            data.jsonrpc = "2.0";
            pub.down.outgoing(serializer.stringify(data));
        }

        /**
         * Creates a method that implements the given definition
         * @private
         * @param {Object} The method configuration
         * @param {String} method The name of the method
         * @return {Function} A stub capable of proxying the requested method call
         */
        function _createMethod(definition, method) {
            var slice = Array.prototype.slice;

            return function () {
                var l = arguments.length, callback, message = {
                    method: method
                };

                if (l > 0 && typeof arguments[l - 1] === "function") {
                    //with callback, procedure
                    if (l > 1 && typeof arguments[l - 2] === "function") {
                        // two callbacks, success and error
                        callback = {
                            success: arguments[l - 2],
                            error: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 2);
                    }
                    else {
                        // single callback, success
                        callback = {
                            success: arguments[l - 1]
                        };
                        message.params = slice.call(arguments, 0, l - 1);
                    }
                    _callbacks["" + (++_callbackCounter)] = callback;
                    message.id = _callbackCounter;
                }
                else {
                    // no callbacks, a notification
                    message.params = slice.call(arguments, 0);
                }
                if (definition.namedParams && message.params.length === 1) {
                    message.params = message.params[0];
                }
                // Send the method request
                _send(message);
            };
        }

        /**
         * Executes the exposed method
         * @private
         * @param {String} method The name of the method
         * @param {Number} id The callback id to use
         * @param {Function} method The exposed implementation
         * @param {Array} params The parameters supplied by the remote end
         */
        function _executeMethod(method, id, fn, params) {
            if (!fn) {
                if (id) {
                    _send({
                        id: id,
                        error: {
                            code: -32601,
                            message: "Procedure not found."
                        }
                    });
                }
                return;
            }

            var success, error;
            if (id) {
                success = function (result) {
                    success = emptyFn;
                    _send({
                        id: id,
                        result: result
                    });
                };
                error = function (message, data) {
                    error = emptyFn;
                    var msg = {
                        id: id,
                        error: {
                            code: -32099,
                            message: message
                        }
                    };
                    if (data) {
                        msg.error.data = data;
                    }
                    _send(msg);
                };
            }
            else {
                success = error = emptyFn;
            }
            // Call local method
            if (!isArray(params)) {
                params = [params];
            }
            try {
                var result = fn.method.apply(fn.scope, params.concat([success, error]));
                if (!undef(result)) {
                    success(result);
                }
            }
            catch (ex1) {
                error(ex1.message);
            }
        }

        return (pub = {
            incoming: function (message, origin) {
                var data = serializer.parse(message);
                if (data.method) {
                    // A method call from the remote end
                    if (config.handle) {
                        config.handle(data, _send);
                    }
                    else {
                        _executeMethod(data.method, data.id, config.local[data.method], data.params);
                    }
                }
                else {
                    // A method response from the other end
                    var callback = _callbacks[data.id];
                    if (data.error) {
                        if (callback.error) {
                            callback.error(data.error);
                        }
                    }
                    else if (callback.success) {
                        callback.success(data.result);
                    }
                    delete _callbacks[data.id];
                }
            },
            init: function () {
                if (config.remote) {
                    // Implement the remote sides exposed methods
                    for (var method in config.remote) {
                        if (config.remote.hasOwnProperty(method)) {
                            proxy[method] = _createMethod(config.remote[method], method);
                        }
                    }
                }
                pub.down.init();
            },
            destroy: function () {
                for (var method in config.remote) {
                    if (config.remote.hasOwnProperty(method) && proxy.hasOwnProperty(method)) {
                        delete proxy[method];
                    }
                }
                pub.down.destroy();
            }
        });
    };
    global.easyXDM = easyXDM;
})(window, document, location, window.setTimeout, decodeURIComponent, encodeURIComponent);

var Zepto = function () { function L(t) { return null == t ? String(t) : j[S.call(t)] || "object" } function Z(t) { return "function" == L(t) } function _(t) { return null != t && t == t.window } function $(t) { return null != t && t.nodeType == t.DOCUMENT_NODE } function D(t) { return "object" == L(t) } function M(t) { return D(t) && !_(t) && Object.getPrototypeOf(t) == Object.prototype } function R(t) { return "number" == typeof t.length } function k(t) { return s.call(t, function (t) { return null != t }) } function z(t) { return t.length > 0 ? n.fn.concat.apply([], t) : t } function F(t) { return t.replace(/::/g, "/").replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").replace(/([a-z\d])([A-Z])/g, "$1_$2").replace(/_/g, "-").toLowerCase() } function q(t) { return t in f ? f[t] : f[t] = new RegExp("(^|\\s)" + t + "(\\s|$)") } function H(t, e) { return "number" != typeof e || c[F(t)] ? e : e + "px" } function I(t) { var e, n; return u[t] || (e = a.createElement(t), a.body.appendChild(e), n = getComputedStyle(e, "").getPropertyValue("display"), e.parentNode.removeChild(e), "none" == n && (n = "block"), u[t] = n), u[t] } function V(t) { return "children" in t ? o.call(t.children) : n.map(t.childNodes, function (t) { return 1 == t.nodeType ? t : void 0 }) } function B(n, i, r) { for (e in i) r && (M(i[e]) || A(i[e])) ? (M(i[e]) && !M(n[e]) && (n[e] = {}), A(i[e]) && !A(n[e]) && (n[e] = []), B(n[e], i[e], r)) : i[e] !== t && (n[e] = i[e]) } function U(t, e) { return null == e ? n(t) : n(t).filter(e) } function J(t, e, n, i) { return Z(e) ? e.call(t, n, i) : e } function X(t, e, n) { null == n ? t.removeAttribute(e) : t.setAttribute(e, n) } function W(e, n) { var i = e.className || "", r = i && i.baseVal !== t; return n === t ? r ? i.baseVal : i : void (r ? i.baseVal = n : e.className = n) } function Y(t) { try { return t ? "true" == t || ("false" == t ? !1 : "null" == t ? null : +t + "" == t ? +t : /^[\[\{]/.test(t) ? n.parseJSON(t) : t) : t } catch (e) { return t } } function G(t, e) { e(t); for (var n = 0, i = t.childNodes.length; i > n; n++) G(t.childNodes[n], e) } var t, e, n, i, C, N, r = [], o = r.slice, s = r.filter, a = window.document, u = {}, f = {}, c = { "column-count": 1, columns: 1, "font-weight": 1, "line-height": 1, opacity: 1, "z-index": 1, zoom: 1 }, l = /^\s*<(\w+|!)[^>]*>/, h = /^<(\w+)\s*\/?>(?:<\/\1>|)$/, p = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, d = /^(?:body|html)$/i, m = /([A-Z])/g, g = ["val", "css", "html", "text", "data", "width", "height", "offset"], v = ["after", "prepend", "before", "append"], y = a.createElement("table"), x = a.createElement("tr"), b = { tr: a.createElement("tbody"), tbody: y, thead: y, tfoot: y, td: x, th: x, "*": a.createElement("div") }, w = /complete|loaded|interactive/, E = /^[\w-]*$/, j = {}, S = j.toString, T = {}, O = a.createElement("div"), P = { tabindex: "tabIndex", readonly: "readOnly", "for": "htmlFor", "class": "className", maxlength: "maxLength", cellspacing: "cellSpacing", cellpadding: "cellPadding", rowspan: "rowSpan", colspan: "colSpan", usemap: "useMap", frameborder: "frameBorder", contenteditable: "contentEditable" }, A = Array.isArray || function (t) { return t instanceof Array }; return T.matches = function (t, e) { if (!e || !t || 1 !== t.nodeType) return !1; var n = t.webkitMatchesSelector || t.mozMatchesSelector || t.oMatchesSelector || t.matchesSelector; if (n) return n.call(t, e); var i, r = t.parentNode, o = !r; return o && (r = O).appendChild(t), i = ~T.qsa(r, e).indexOf(t), o && O.removeChild(t), i }, C = function (t) { return t.replace(/-+(.)?/g, function (t, e) { return e ? e.toUpperCase() : "" }) }, N = function (t) { return s.call(t, function (e, n) { return t.indexOf(e) == n }) }, T.fragment = function (e, i, r) { var s, u, f; return h.test(e) && (s = n(a.createElement(RegExp.$1))), s || (e.replace && (e = e.replace(p, "<$1></$2>")), i === t && (i = l.test(e) && RegExp.$1), i in b || (i = "*"), f = b[i], f.innerHTML = "" + e, s = n.each(o.call(f.childNodes), function () { f.removeChild(this) })), M(r) && (u = n(s), n.each(r, function (t, e) { g.indexOf(t) > -1 ? u[t](e) : u.attr(t, e) })), s }, T.Z = function (t, e) { return t = t || [], t.__proto__ = n.fn, t.selector = e || "", t }, T.isZ = function (t) { return t instanceof T.Z }, T.init = function (e, i) { var r; if (!e) return T.Z(); if ("string" == typeof e) if (e = e.trim(), "<" == e[0] && l.test(e)) r = T.fragment(e, RegExp.$1, i), e = null; else { if (i !== t) return n(i).find(e); r = T.qsa(a, e) } else { if (Z(e)) return n(a).ready(e); if (T.isZ(e)) return e; if (A(e)) r = k(e); else if (D(e)) r = [e], e = null; else if (l.test(e)) r = T.fragment(e.trim(), RegExp.$1, i), e = null; else { if (i !== t) return n(i).find(e); r = T.qsa(a, e) } } return T.Z(r, e) }, n = function (t, e) { return T.init(t, e) }, n.extend = function (t) { var e, n = o.call(arguments, 1); return "boolean" == typeof t && (e = t, t = n.shift()), n.forEach(function (n) { B(t, n, e) }), t }, T.qsa = function (t, e) { var n, i = "#" == e[0], r = !i && "." == e[0], s = i || r ? e.slice(1) : e, a = E.test(s); return $(t) && a && i ? (n = t.getElementById(s)) ? [n] : [] : 1 !== t.nodeType && 9 !== t.nodeType ? [] : o.call(a && !i ? r ? t.getElementsByClassName(s) : t.getElementsByTagName(e) : t.querySelectorAll(e)) }, n.contains = a.documentElement.contains ? function (t, e) { return t !== e && t.contains(e) } : function (t, e) { for (; e && (e = e.parentNode) ;) if (e === t) return !0; return !1 }, n.type = L, n.isFunction = Z, n.isWindow = _, n.isArray = A, n.isPlainObject = M, n.isEmptyObject = function (t) { var e; for (e in t) return !1; return !0 }, n.inArray = function (t, e, n) { return r.indexOf.call(e, t, n) }, n.camelCase = C, n.trim = function (t) { return null == t ? "" : String.prototype.trim.call(t) }, n.uuid = 0, n.support = {}, n.expr = {}, n.map = function (t, e) { var n, r, o, i = []; if (R(t)) for (r = 0; r < t.length; r++) n = e(t[r], r), null != n && i.push(n); else for (o in t) n = e(t[o], o), null != n && i.push(n); return z(i) }, n.each = function (t, e) { var n, i; if (R(t)) { for (n = 0; n < t.length; n++) if (e.call(t[n], n, t[n]) === !1) return t } else for (i in t) if (e.call(t[i], i, t[i]) === !1) return t; return t }, n.grep = function (t, e) { return s.call(t, e) }, window.JSON && (n.parseJSON = JSON.parse), n.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (t, e) { j["[object " + e + "]"] = e.toLowerCase() }), n.fn = { forEach: r.forEach, reduce: r.reduce, push: r.push, sort: r.sort, indexOf: r.indexOf, concat: r.concat, map: function (t) { return n(n.map(this, function (e, n) { return t.call(e, n, e) })) }, slice: function () { return n(o.apply(this, arguments)) }, ready: function (t) { return w.test(a.readyState) && a.body ? t(n) : a.addEventListener("DOMContentLoaded", function () { t(n) }, !1), this }, get: function (e) { return e === t ? o.call(this) : this[e >= 0 ? e : e + this.length] }, toArray: function () { return this.get() }, size: function () { return this.length }, remove: function () { return this.each(function () { null != this.parentNode && this.parentNode.removeChild(this) }) }, each: function (t) { return r.every.call(this, function (e, n) { return t.call(e, n, e) !== !1 }), this }, filter: function (t) { return Z(t) ? this.not(this.not(t)) : n(s.call(this, function (e) { return T.matches(e, t) })) }, add: function (t, e) { return n(N(this.concat(n(t, e)))) }, is: function (t) { return this.length > 0 && T.matches(this[0], t) }, not: function (e) { var i = []; if (Z(e) && e.call !== t) this.each(function (t) { e.call(this, t) || i.push(this) }); else { var r = "string" == typeof e ? this.filter(e) : R(e) && Z(e.item) ? o.call(e) : n(e); this.forEach(function (t) { r.indexOf(t) < 0 && i.push(t) }) } return n(i) }, has: function (t) { return this.filter(function () { return D(t) ? n.contains(this, t) : n(this).find(t).size() }) }, eq: function (t) { return -1 === t ? this.slice(t) : this.slice(t, +t + 1) }, first: function () { var t = this[0]; return t && !D(t) ? t : n(t) }, last: function () { var t = this[this.length - 1]; return t && !D(t) ? t : n(t) }, find: function (t) { var e, i = this; return e = t ? "object" == typeof t ? n(t).filter(function () { var t = this; return r.some.call(i, function (e) { return n.contains(e, t) }) }) : 1 == this.length ? n(T.qsa(this[0], t)) : this.map(function () { return T.qsa(this, t) }) : n() }, closest: function (t, e) { var i = this[0], r = !1; for ("object" == typeof t && (r = n(t)) ; i && !(r ? r.indexOf(i) >= 0 : T.matches(i, t)) ;) i = i !== e && !$(i) && i.parentNode; return n(i) }, parents: function (t) { for (var e = [], i = this; i.length > 0;) i = n.map(i, function (t) { return (t = t.parentNode) && !$(t) && e.indexOf(t) < 0 ? (e.push(t), t) : void 0 }); return U(e, t) }, parent: function (t) { return U(N(this.pluck("parentNode")), t) }, children: function (t) { return U(this.map(function () { return V(this) }), t) }, contents: function () { return this.map(function () { return o.call(this.childNodes) }) }, siblings: function (t) { return U(this.map(function (t, e) { return s.call(V(e.parentNode), function (t) { return t !== e }) }), t) }, empty: function () { return this.each(function () { this.innerHTML = "" }) }, pluck: function (t) { return n.map(this, function (e) { return e[t] }) }, show: function () { return this.each(function () { "none" == this.style.display && (this.style.display = ""), "none" == getComputedStyle(this, "").getPropertyValue("display") && (this.style.display = I(this.nodeName)) }) }, replaceWith: function (t) { return this.before(t).remove() }, wrap: function (t) { var e = Z(t); if (this[0] && !e) var i = n(t).get(0), r = i.parentNode || this.length > 1; return this.each(function (o) { n(this).wrapAll(e ? t.call(this, o) : r ? i.cloneNode(!0) : i) }) }, wrapAll: function (t) { if (this[0]) { n(this[0]).before(t = n(t)); for (var e; (e = t.children()).length;) t = e.first(); n(t).append(this) } return this }, wrapInner: function (t) { var e = Z(t); return this.each(function (i) { var r = n(this), o = r.contents(), s = e ? t.call(this, i) : t; o.length ? o.wrapAll(s) : r.append(s) }) }, unwrap: function () { return this.parent().each(function () { n(this).replaceWith(n(this).children()) }), this }, clone: function () { return this.map(function () { return this.cloneNode(!0) }) }, hide: function () { return this.css("display", "none") }, toggle: function (e) { return this.each(function () { var i = n(this); (e === t ? "none" == i.css("display") : e) ? i.show() : i.hide() }) }, prev: function (t) { return n(this.pluck("previousElementSibling")).filter(t || "*") }, next: function (t) { return n(this.pluck("nextElementSibling")).filter(t || "*") }, html: function (t) { return 0 in arguments ? this.each(function (e) { var i = this.innerHTML; n(this).empty().append(J(this, t, e, i)) }) : 0 in this ? this[0].innerHTML : null }, text: function (t) { return 0 in arguments ? this.each(function (e) { var n = J(this, t, e, this.textContent); this.textContent = null == n ? "" : "" + n }) : 0 in this ? this[0].textContent : null }, attr: function (n, i) { var r; return "string" != typeof n || 1 in arguments ? this.each(function (t) { if (1 === this.nodeType) if (D(n)) for (e in n) X(this, e, n[e]); else X(this, n, J(this, i, t, this.getAttribute(n))) }) : this.length && 1 === this[0].nodeType ? !(r = this[0].getAttribute(n)) && n in this[0] ? this[0][n] : r : t }, removeAttr: function (t) { return this.each(function () { 1 === this.nodeType && t.split(" ").forEach(function (t) { X(this, t) }, this) }) }, prop: function (t, e) { return t = P[t] || t, 1 in arguments ? this.each(function (n) { this[t] = J(this, e, n, this[t]) }) : this[0] && this[0][t] }, data: function (e, n) { var i = "data-" + e.replace(m, "-$1").toLowerCase(), r = 1 in arguments ? this.attr(i, n) : this.attr(i); return null !== r ? Y(r) : t }, val: function (t) { return 0 in arguments ? this.each(function (e) { this.value = J(this, t, e, this.value) }) : this[0] && (this[0].multiple ? n(this[0]).find("option").filter(function () { return this.selected }).pluck("value") : this[0].value) }, offset: function (t) { if (t) return this.each(function (e) { var i = n(this), r = J(this, t, e, i.offset()), o = i.offsetParent().offset(), s = { top: r.top - o.top, left: r.left - o.left }; "static" == i.css("position") && (s.position = "relative"), i.css(s) }); if (!this.length) return null; var e = this[0].getBoundingClientRect(); return { left: e.left + window.pageXOffset, top: e.top + window.pageYOffset, width: Math.round(e.width), height: Math.round(e.height) } }, css: function (t, i) { if (arguments.length < 2) { var r, o = this[0]; if (!o) return; if (r = getComputedStyle(o, ""), "string" == typeof t) return o.style[C(t)] || r.getPropertyValue(t); if (A(t)) { var s = {}; return n.each(t, function (t, e) { s[e] = o.style[C(e)] || r.getPropertyValue(e) }), s } } var a = ""; if ("string" == L(t)) i || 0 === i ? a = F(t) + ":" + H(t, i) : this.each(function () { this.style.removeProperty(F(t)) }); else for (e in t) t[e] || 0 === t[e] ? a += F(e) + ":" + H(e, t[e]) + ";" : this.each(function () { this.style.removeProperty(F(e)) }); return this.each(function () { this.style.cssText += ";" + a }) }, index: function (t) { return t ? this.indexOf(n(t)[0]) : this.parent().children().indexOf(this[0]) }, hasClass: function (t) { return t ? r.some.call(this, function (t) { return this.test(W(t)) }, q(t)) : !1 }, addClass: function (t) { return t ? this.each(function (e) { if ("className" in this) { i = []; var r = W(this), o = J(this, t, e, r); o.split(/\s+/g).forEach(function (t) { n(this).hasClass(t) || i.push(t) }, this), i.length && W(this, r + (r ? " " : "") + i.join(" ")) } }) : this }, removeClass: function (e) { return this.each(function (n) { if ("className" in this) { if (e === t) return W(this, ""); i = W(this), J(this, e, n, i).split(/\s+/g).forEach(function (t) { i = i.replace(q(t), " ") }), W(this, i.trim()) } }) }, toggleClass: function (e, i) { return e ? this.each(function (r) { var o = n(this), s = J(this, e, r, W(this)); s.split(/\s+/g).forEach(function (e) { (i === t ? !o.hasClass(e) : i) ? o.addClass(e) : o.removeClass(e) }) }) : this }, scrollTop: function (e) { if (this.length) { var n = "scrollTop" in this[0]; return e === t ? n ? this[0].scrollTop : this[0].pageYOffset : this.each(n ? function () { this.scrollTop = e } : function () { this.scrollTo(this.scrollX, e) }) } }, scrollLeft: function (e) { if (this.length) { var n = "scrollLeft" in this[0]; return e === t ? n ? this[0].scrollLeft : this[0].pageXOffset : this.each(n ? function () { this.scrollLeft = e } : function () { this.scrollTo(e, this.scrollY) }) } }, position: function () { if (this.length) { var t = this[0], e = this.offsetParent(), i = this.offset(), r = d.test(e[0].nodeName) ? { top: 0, left: 0 } : e.offset(); return i.top -= parseFloat(n(t).css("margin-top")) || 0, i.left -= parseFloat(n(t).css("margin-left")) || 0, r.top += parseFloat(n(e[0]).css("border-top-width")) || 0, r.left += parseFloat(n(e[0]).css("border-left-width")) || 0, { top: i.top - r.top, left: i.left - r.left } } }, offsetParent: function () { return this.map(function () { for (var t = this.offsetParent || a.body; t && !d.test(t.nodeName) && "static" == n(t).css("position") ;) t = t.offsetParent; return t }) } }, n.fn.detach = n.fn.remove, ["width", "height"].forEach(function (e) { var i = e.replace(/./, function (t) { return t[0].toUpperCase() }); n.fn[e] = function (r) { var o, s = this[0]; return r === t ? _(s) ? s["inner" + i] : $(s) ? s.documentElement["scroll" + i] : (o = this.offset()) && o[e] : this.each(function (t) { s = n(this), s.css(e, J(this, r, t, s[e]())) }) } }), v.forEach(function (t, e) { var i = e % 2; n.fn[t] = function () { var t, o, r = n.map(arguments, function (e) { return t = L(e), "object" == t || "array" == t || null == e ? e : T.fragment(e) }), s = this.length > 1; return r.length < 1 ? this : this.each(function (t, u) { o = i ? u : u.parentNode, u = 0 == e ? u.nextSibling : 1 == e ? u.firstChild : 2 == e ? u : null; var f = n.contains(a.documentElement, o); r.forEach(function (t) { if (s) t = t.cloneNode(!0); else if (!o) return n(t).remove(); o.insertBefore(t, u), f && G(t, function (t) { null == t.nodeName || "SCRIPT" !== t.nodeName.toUpperCase() || t.type && "text/javascript" !== t.type || t.src || window.eval.call(window, t.innerHTML) }) }) }) }, n.fn[i ? t + "To" : "insert" + (e ? "Before" : "After")] = function (e) { return n(e)[t](this), this } }), T.Z.prototype = n.fn, T.uniq = N, T.deserializeValue = Y, n.zepto = T, n }(); window.Zepto = Zepto, void 0 === window.$ && (window.$ = Zepto), function (t) { function l(t) { return t._zid || (t._zid = e++) } function h(t, e, n, i) { if (e = p(e), e.ns) var r = d(e.ns); return (s[l(t)] || []).filter(function (t) { return !(!t || e.e && t.e != e.e || e.ns && !r.test(t.ns) || n && l(t.fn) !== l(n) || i && t.sel != i) }) } function p(t) { var e = ("" + t).split("."); return { e: e[0], ns: e.slice(1).sort().join(" ") } } function d(t) { return new RegExp("(?:^| )" + t.replace(" ", " .* ?") + "(?: |$)") } function m(t, e) { return t.del && !u && t.e in f || !!e } function g(t) { return c[t] || u && f[t] || t } function v(e, i, r, o, a, u, f) { var h = l(e), d = s[h] || (s[h] = []); i.split(/\s/).forEach(function (i) { if ("ready" == i) return t(document).ready(r); var s = p(i); s.fn = r, s.sel = a, s.e in c && (r = function (e) { var n = e.relatedTarget; return !n || n !== this && !t.contains(this, n) ? s.fn.apply(this, arguments) : void 0 }), s.del = u; var l = u || r; s.proxy = function (t) { if (t = j(t), !t.isImmediatePropagationStopped()) { t.data = o; var i = l.apply(e, t._args == n ? [t] : [t].concat(t._args)); return i === !1 && (t.preventDefault(), t.stopPropagation()), i } }, s.i = d.length, d.push(s), "addEventListener" in e && e.addEventListener(g(s.e), s.proxy, m(s, f)) }) } function y(t, e, n, i, r) { var o = l(t); (e || "").split(/\s/).forEach(function (e) { h(t, e, n, i).forEach(function (e) { delete s[o][e.i], "removeEventListener" in t && t.removeEventListener(g(e.e), e.proxy, m(e, r)) }) }) } function j(e, i) { return (i || !e.isDefaultPrevented) && (i || (i = e), t.each(E, function (t, n) { var r = i[t]; e[t] = function () { return this[n] = x, r && r.apply(i, arguments) }, e[n] = b }), (i.defaultPrevented !== n ? i.defaultPrevented : "returnValue" in i ? i.returnValue === !1 : i.getPreventDefault && i.getPreventDefault()) && (e.isDefaultPrevented = x)), e } function S(t) { var e, i = { originalEvent: t }; for (e in t) w.test(e) || t[e] === n || (i[e] = t[e]); return j(i, t) } var n, e = 1, i = Array.prototype.slice, r = t.isFunction, o = function (t) { return "string" == typeof t }, s = {}, a = {}, u = "onfocusin" in window, f = { focus: "focusin", blur: "focusout" }, c = { mouseenter: "mouseover", mouseleave: "mouseout" }; a.click = a.mousedown = a.mouseup = a.mousemove = "MouseEvents", t.event = { add: v, remove: y }, t.proxy = function (e, n) { var s = 2 in arguments && i.call(arguments, 2); if (r(e)) { var a = function () { return e.apply(n, s ? s.concat(i.call(arguments)) : arguments) }; return a._zid = l(e), a } if (o(n)) return s ? (s.unshift(e[n], e), t.proxy.apply(null, s)) : t.proxy(e[n], e); throw new TypeError("expected function") }, t.fn.bind = function (t, e, n) { return this.on(t, e, n) }, t.fn.unbind = function (t, e) { return this.off(t, e) }, t.fn.one = function (t, e, n, i) { return this.on(t, e, n, i, 1) }; var x = function () { return !0 }, b = function () { return !1 }, w = /^([A-Z]|returnValue$|layer[XY]$)/, E = { preventDefault: "isDefaultPrevented", stopImmediatePropagation: "isImmediatePropagationStopped", stopPropagation: "isPropagationStopped" }; t.fn.delegate = function (t, e, n) { return this.on(e, t, n) }, t.fn.undelegate = function (t, e, n) { return this.off(e, t, n) }, t.fn.live = function (e, n) { return t(document.body).delegate(this.selector, e, n), this }, t.fn.die = function (e, n) { return t(document.body).undelegate(this.selector, e, n), this }, t.fn.on = function (e, s, a, u, f) { var c, l, h = this; return e && !o(e) ? (t.each(e, function (t, e) { h.on(t, s, a, e, f) }), h) : (o(s) || r(u) || u === !1 || (u = a, a = s, s = n), (r(a) || a === !1) && (u = a, a = n), u === !1 && (u = b), h.each(function (n, r) { f && (c = function (t) { return y(r, t.type, u), u.apply(this, arguments) }), s && (l = function (e) { var n, o = t(e.target).closest(s, r).get(0); return o && o !== r ? (n = t.extend(S(e), { currentTarget: o, liveFired: r }), (c || u).apply(o, [n].concat(i.call(arguments, 1)))) : void 0 }), v(r, e, u, a, s, l || c) })) }, t.fn.off = function (e, i, s) { var a = this; return e && !o(e) ? (t.each(e, function (t, e) { a.off(t, i, e) }), a) : (o(i) || r(s) || s === !1 || (s = i, i = n), s === !1 && (s = b), a.each(function () { y(this, e, s, i) })) }, t.fn.trigger = function (e, n) { return e = o(e) || t.isPlainObject(e) ? t.Event(e) : j(e), e._args = n, this.each(function () { e.type in f && "function" == typeof this[e.type] ? this[e.type]() : "dispatchEvent" in this ? this.dispatchEvent(e) : t(this).triggerHandler(e, n) }) }, t.fn.triggerHandler = function (e, n) { var i, r; return this.each(function (s, a) { i = S(o(e) ? t.Event(e) : e), i._args = n, i.target = a, t.each(h(a, e.type || e), function (t, e) { return r = e.proxy(i), i.isImmediatePropagationStopped() ? !1 : void 0 }) }), r }, "focusin focusout focus blur load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select keydown keypress keyup error".split(" ").forEach(function (e) { t.fn[e] = function (t) { return 0 in arguments ? this.bind(e, t) : this.trigger(e) } }), t.Event = function (t, e) { o(t) || (e = t, t = e.type); var n = document.createEvent(a[t] || "Events"), i = !0; if (e) for (var r in e) "bubbles" == r ? i = !!e[r] : n[r] = e[r]; return n.initEvent(t, i, !0), j(n) } }(Zepto), function (t) { function h(e, n, i) { var r = t.Event(n); return t(e).trigger(r, i), !r.isDefaultPrevented() } function p(t, e, i, r) { return t.global ? h(e || n, i, r) : void 0 } function d(e) { e.global && 0 === t.active++ && p(e, null, "ajaxStart") } function m(e) { e.global && !--t.active && p(e, null, "ajaxStop") } function g(t, e) { var n = e.context; return e.beforeSend.call(n, t, e) === !1 || p(e, n, "ajaxBeforeSend", [t, e]) === !1 ? !1 : void p(e, n, "ajaxSend", [t, e]) } function v(t, e, n, i) { var r = n.context, o = "success"; n.success.call(r, t, o, e), i && i.resolveWith(r, [t, o, e]), p(n, r, "ajaxSuccess", [e, n, t]), x(o, e, n) } function y(t, e, n, i, r) { var o = i.context; i.error.call(o, n, e, t), r && r.rejectWith(o, [n, e, t]), p(i, o, "ajaxError", [n, i, t || e]), x(e, n, i) } function x(t, e, n) { var i = n.context; n.complete.call(i, e, t), p(n, i, "ajaxComplete", [e, n]), m(n) } function b() { } function w(t) { return t && (t = t.split(";", 2)[0]), t && (t == f ? "html" : t == u ? "json" : s.test(t) ? "script" : a.test(t) && "xml") || "text" } function E(t, e) { return "" == e ? t : (t + "&" + e).replace(/[&?]{1,2}/, "?") } function j(e) { e.processData && e.data && "string" != t.type(e.data) && (e.data = t.param(e.data, e.traditional)), !e.data || e.type && "GET" != e.type.toUpperCase() || (e.url = E(e.url, e.data), e.data = void 0) } function S(e, n, i, r) { return t.isFunction(n) && (r = i, i = n, n = void 0), t.isFunction(i) || (r = i, i = void 0), { url: e, data: n, success: i, dataType: r } } function C(e, n, i, r) { var o, s = t.isArray(n), a = t.isPlainObject(n); t.each(n, function (n, u) { o = t.type(u), r && (n = i ? r : r + "[" + (a || "object" == o || "array" == o ? n : "") + "]"), !r && s ? e.add(u.name, u.value) : "array" == o || !i && "object" == o ? C(e, u, i, n) : e.add(n, u) }) } var i, r, e = 0, n = window.document, o = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, s = /^(?:text|application)\/javascript/i, a = /^(?:text|application)\/xml/i, u = "application/json", f = "text/html", c = /^\s*$/, l = n.createElement("a"); l.href = window.location.href, t.active = 0, t.ajaxJSONP = function (i, r) { if (!("type" in i)) return t.ajax(i); var f, h, o = i.jsonpCallback, s = (t.isFunction(o) ? o() : o) || "jsonp" + ++e, a = n.createElement("script"), u = window[s], c = function (e) { t(a).triggerHandler("error", e || "abort") }, l = { abort: c }; return r && r.promise(l), t(a).on("load error", function (e, n) { clearTimeout(h), t(a).off().remove(), "error" != e.type && f ? v(f[0], l, i, r) : y(null, n || "error", l, i, r), window[s] = u, f && t.isFunction(u) && u(f[0]), u = f = void 0 }), g(l, i) === !1 ? (c("abort"), l) : (window[s] = function () { f = arguments }, a.src = i.url.replace(/\?(.+)=\?/, "?$1=" + s), n.head.appendChild(a), i.timeout > 0 && (h = setTimeout(function () { c("timeout") }, i.timeout)), l) }, t.ajaxSettings = { type: "GET", beforeSend: b, success: b, error: b, complete: b, context: null, global: !0, xhr: function () { return new window.XMLHttpRequest }, accepts: { script: "text/javascript, application/javascript, application/x-javascript", json: u, xml: "application/xml, text/xml", html: f, text: "text/plain" }, crossDomain: !1, timeout: 0, processData: !0, cache: !0 }, t.ajax = function (e) { var a, o = t.extend({}, e || {}), s = t.Deferred && t.Deferred(); for (i in t.ajaxSettings) void 0 === o[i] && (o[i] = t.ajaxSettings[i]); d(o), o.crossDomain || (a = n.createElement("a"), a.href = o.url, a.href = a.href, o.crossDomain = l.protocol + "//" + l.host != a.protocol + "//" + a.host), o.url || (o.url = window.location.toString()), j(o); var u = o.dataType, f = /\?.+=\?/.test(o.url); if (f && (u = "jsonp"), o.cache !== !1 && (e && e.cache === !0 || "script" != u && "jsonp" != u) || (o.url = E(o.url, "_=" + Date.now())), "jsonp" == u) return f || (o.url = E(o.url, o.jsonp ? o.jsonp + "=?" : o.jsonp === !1 ? "" : "callback=?")), t.ajaxJSONP(o, s); var C, h = o.accepts[u], p = {}, m = function (t, e) { p[t.toLowerCase()] = [t, e] }, x = /^([\w-]+:)\/\//.test(o.url) ? RegExp.$1 : window.location.protocol, S = o.xhr(), T = S.setRequestHeader; if (s && s.promise(S), o.crossDomain || m("X-Requested-With", "XMLHttpRequest"), m("Accept", h || "*/*"), (h = o.mimeType || h) && (h.indexOf(",") > -1 && (h = h.split(",", 2)[0]), S.overrideMimeType && S.overrideMimeType(h)), (o.contentType || o.contentType !== !1 && o.data && "GET" != o.type.toUpperCase()) && m("Content-Type", o.contentType || "application/x-www-form-urlencoded"), o.headers) for (r in o.headers) m(r, o.headers[r]); if (S.setRequestHeader = m, S.onreadystatechange = function () { if (4 == S.readyState) { S.onreadystatechange = b, clearTimeout(C); var e, n = !1; if (S.status >= 200 && S.status < 300 || 304 == S.status || 0 == S.status && "file:" == x) { u = u || w(o.mimeType || S.getResponseHeader("content-type")), e = S.responseText; try { "script" == u ? (1, eval)(e) : "xml" == u ? e = S.responseXML : "json" == u && (e = c.test(e) ? null : t.parseJSON(e)) } catch (i) { n = i } n ? y(n, "parsererror", S, o, s) : v(e, S, o, s) } else y(S.statusText || null, S.status ? "error" : "abort", S, o, s) } }, g(S, o) === !1) return S.abort(), y(null, "abort", S, o, s), S; if (o.xhrFields) for (r in o.xhrFields) S[r] = o.xhrFields[r]; var N = "async" in o ? o.async : !0; S.open(o.type, o.url, N, o.username, o.password); for (r in p) T.apply(S, p[r]); return o.timeout > 0 && (C = setTimeout(function () { S.onreadystatechange = b, S.abort(), y(null, "timeout", S, o, s) }, o.timeout)), S.send(o.data ? o.data : null), S }, t.get = function () { return t.ajax(S.apply(null, arguments)) }, t.post = function () { var e = S.apply(null, arguments); return e.type = "POST", t.ajax(e) }, t.getJSON = function () { var e = S.apply(null, arguments); return e.dataType = "json", t.ajax(e) }, t.fn.load = function (e, n, i) { if (!this.length) return this; var a, r = this, s = e.split(/\s/), u = S(e, n, i), f = u.success; return s.length > 1 && (u.url = s[0], a = s[1]), u.success = function (e) { r.html(a ? t("<div>").html(e.replace(o, "")).find(a) : e), f && f.apply(r, arguments) }, t.ajax(u), this }; var T = encodeURIComponent; t.param = function (e, n) { var i = []; return i.add = function (e, n) { t.isFunction(n) && (n = n()), null == n && (n = ""), this.push(T(e) + "=" + T(n)) }, C(i, e, n), i.join("&").replace(/%20/g, "+") } }(Zepto), function (t) { t.fn.serializeArray = function () { var e, n, i = [], r = function (t) { return t.forEach ? t.forEach(r) : void i.push({ name: e, value: t }) }; return this[0] && t.each(this[0].elements, function (i, o) { n = o.type, e = o.name, e && "fieldset" != o.nodeName.toLowerCase() && !o.disabled && "submit" != n && "reset" != n && "button" != n && "file" != n && ("radio" != n && "checkbox" != n || o.checked) && r(t(o).val()) }), i }, t.fn.serialize = function () { var t = []; return this.serializeArray().forEach(function (e) { t.push(encodeURIComponent(e.name) + "=" + encodeURIComponent(e.value)) }), t.join("&") }, t.fn.submit = function (e) { if (0 in arguments) this.bind("submit", e); else if (this.length) { var n = t.Event("submit"); this.eq(0).trigger(n), n.isDefaultPrevented() || this.get(0).submit() } return this } }(Zepto), function (t) { "__proto__" in {} || t.extend(t.zepto, { Z: function (e, n) { return e = e || [], t.extend(e, t.fn), e.selector = n || "", e.__Z = !0, e }, isZ: function (e) { return "array" === t.type(e) && "__Z" in e } }); try { getComputedStyle(void 0) } catch (e) { var n = getComputedStyle; window.getComputedStyle = function (t) { try { return n(t) } catch (e) { return null } } } }(Zepto);




    var $ = Zepto;
    var defer;
    var success = false;
    function checkout(authResponse) {
        var $body = $('body');
        var oldOverflow = $body.css('overflow');
        $body.css({ overflow: 'hidden' });
        var $div = $('<div style="position: fixed;top:0;left:0;width:100%;height:100%;overflow: auto;z-index: 2147483639;background: rgba(0,0,0,0.65);padding: 30px 0"></div>');
        $div.css({ opacity: 25 });

        $div.one('click', function () {
            dismiss();
        });
        var $iframe = $(),
                lastWidth = 0,
                lastHeight = 0;
        function setSize(width, height) {
            if (height > 0 && $iframe.length > 0) {
                $div.css({ opacity: 1 });
            } else {
                lastWidth = width;
                lastHeight = height;
            }
            
            $iframe.css({
                width: width + 'px',
                height: height + 'px',
                position: 'relative',
                top: Math.floor(width / 2) + 'px',
                left:  Math.floor(height/2)+'px',
                overflow: 'auto',
                //marginLeft: Math.floor(width / 2) + 'px',
                //marginTop: Math.floor(height/2)+'px'
            });
        }

        function dismiss() {
            $body.css({ overflow: oldOverflow });
            socket.destroy();
            $div.remove();
            //success ? defer.resolve() : defer.reject();
        }


        //TODO: Check whether this will work on https?
        var socket = new easyXDM.Rpc({
            remote: "http://localhost:17487/home/index?request=" + authResponse, // the path to the provider
            container: $div[0],
            props: {
                style: {
                    width: "800px",
                    height: "572px",
                    position: "relative",
                    left: "50%",
                    overflow: "auto",
                    "margin-left": "-400px"
                },
                allowtransparency: "true"
            },
            onReady: function () {
                alert("ready...");
                $iframe = $div.children('iframe');
                //socket.initForAuth(authResponse);
                setSize(lastWidth, lastHeight);
            }
        }, {
            local: {
                setSize: function (width, height) {
                    setSize(width, height);
                },
                cancel: function () {
                    dismiss();
                },
                success: function (codeResponse) {
                    success = true;
                }
            },
            remote: {
                initForAuth: {}
            }
        });
        $div.appendTo($body);
        return "Aloha Return";
    }
    window.paygate = {
        checkout: function (authResponse) {
            return checkout(authResponse);
        }
    }
