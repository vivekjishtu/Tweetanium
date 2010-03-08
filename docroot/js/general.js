// Globals
var Timelines = [];

YUI({
	//combine: true,
	modules: {
		'gallery-yql': {
			fullpath: 'http://yui.yahooapis.com/gallery-2010.01.27-20/build/gallery-yql/gallery-yql-min.js',
			requires: ['get','event-custom'],
			optional: [],
			supersedes: []
		},
		'Timeline': {
			fullpath: 'http://tweetanium.net/js/timeline.js',
			requires: [],
			optional: [],
			supersedes: []
		},
		'Bucket': {
			fullpath: 'http://tweetanium.net/js/bucket.js',
			requires: [],
			optional: [],
			supersedes: []
		},
		'Tweet': {
			fullpath: 'http://tweetanium.net/js/tweet.js',
			requires: [],
			optional: [],
			supersedes: []
		},
		'Twitter': {
			fullpath: 'http://tweetanium.net/js/twitter.js',
			requires: ['io-base', 'gallery-yql', 'json'],
			optional: [],
			supersedes: []
		},
		'User': {
			fullpath: 'http://tweetanium.net/js/user.js',
			requires: [],
			optional: [],
			supersedes: []
		},
		'List': {
			fullpath: 'http://tweetanium.net/js/list.js',
			requires: [],
			optional: [],
			supersedes: []
		},
	}
}).use('node', 'dom', 'Timeline', 'Bucket', 'Tweet', 'Twitter', 'User', 'List', function(Y) {
	
	function newState() {
		var state 	 = null;
		var config 	 = {};
		var Timeline = {};
		var timelineCount = 0;
		
		timelineCount = Timelines.length;
		
		for(var i=0; i < timelineCount; i++) {
			Timelines[i].destroy();
			Timelines.splice(i, 1); // Splice, instead of delete, to not leave any holes in the array.
		}
		
		if (state = getHashStringParameter('timeline')) {
			config = {
				type: 		"timeline",
				timeline: 	state
			};
		} 
		else if (state = getHashStringParameter('query')) {
			config = {
				type: 		"search",
				timeline: 	state
			};
		}
		else {
			throw ("Unknown state");
		}
		
		if (config.timeline) {
			Timeline = Object.create(Y.Timeline);
			Timeline.init(config);

			window.Timelines.push(Timeline);
		}
	}
	
	// Recalculate timestamps
	setInterval(function() {
		Y.all(".timestamp").each(function(node){
			node.set("innerHTML", relative_time(node.getAttribute('title')));
		})
	}, 60000);
	
	// Load the initial state and loop to detect any URL Hash changes
	setTimeout(newState, 100);
	(function () {
		var lastHash = location.hash;
		if (lastHash == '')
			window.location.hash = "#timeline=home";
			
		return setInterval(function() {
		    if(lastHash !== location.hash) {
				lastHash = location.hash;
				newState();
		    }
		}, 500);
	})();
	
	// Load in the user's lists
	(function(){
		var request = {};
		request.type = "lists";
		Y.Twitter.call(request, function(lists){
			var html = '';
			for(var i in lists) {
				List = Object.create(Y.List);
				List.init(lists[i]);
				html += List.asHtml();
			}
			Y.one("#lists").set("innerHTML", html);
		});
	})()
	
	Y.on('click', closeSideboxHandler, '#link-close-sidebox');
	Y.delegate('click', userHandler, '#timeline', '.username');
	
	function closeSideboxHandler() {
		Y.one("#sidebox").addClass("hidden");
	}
	
	function userHandler(e){
		var User = Object.create(Y.User);
		var username = Y.one(e.target).get("innerHTML");
		
		User.init({"username":username});
		User.load(function(U){
			Y.one("#sidebox .inner").setContent(U.asHtml());
			Y.one("#sidebox").removeClass("hidden");
		});
	}
	
	var allowUpdate = true;
	function unlockUpdating() {
		allowUpdate = true;
	}
	
	window.onscroll = function() {
		/* <auto-update> */
		    var st = (document.documentElement.scrollTop || document.body.scrollTop);
		    var wh = (window.innerHeight && window.innerHeight < Y.DOM.winHeight()) ? window.innerHeight : Y.DOM.winHeight();
		
			var coverage = st + wh;
			var docHeight = Y.DOM.docHeight();
		
			if (coverage >= (docHeight - 0) && allowUpdate) {
				var t = Timelines[0];
				where = {
					field : "max_id",
					value : t.lowestTweetId(),
				};
				t.addBucket("append").getTweets(t.config, where);
			
				allowUpdate = false;
				setTimeout(unlockUpdating, 3000);
			}
		/* </auto-update> */
		
		
		/* <sticky sidebox> */
			var offset = 30;
			if( window.XMLHttpRequest ) {
				//Moving
				if (document.documentElement.scrollTop > offset || self.pageYOffset > offset) {
					document.getElementById('sidebox').style.position = 'fixed';
					document.getElementById('sidebox').style.top = 0;
				} 
				// At top
				else if (document.documentElement.scrollTop < offset || self.pageYOffset < offset) {
					document.getElementById('sidebox').style.position = 'absolute';
					document.getElementById('sidebox').style.top = offset + 'px';
				}
			}
		/* </sticky sidebox> */
	}
});

// Helper functions

function ratelimit(fn, ms) {
    var last = (new Date()).getTime();
    return (function() {
        var now = (new Date()).getTime();
        if (now - last > ms) {
            last = now;
            fn.apply(null, arguments);
        }
    });
}

function getHashStringParameter(parameter){
	var queryString = {};
	var parameters  = window.location.hash.substring(1).split('&');
	var pos, paramname, paramval;

	for (var i in parameters) {
		pos = parameters[i].indexOf('=');
		if (pos > 0) {
			paramname = parameters[i].substring(0,pos);
			paramval  = parameters[i].substring(pos+1);
			queryString[paramname] = unescape(paramval.replace(/\+/g,' '));
		}
		else {
			queryString[parameters[i]] = "";
		}
	}
	if (queryString[parameter]) {
		return queryString[parameter];
	}
	else {
		return false;
	}
}

function relative_time(parsed_date) {
	var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
	var delta 		= parseInt((relative_to.getTime() - parsed_date) / 1000) + (relative_to.getTimezoneOffset() * 60);

	if (delta < 60) {
		return 'less than a minute ago';
	} else if(delta < 120) {
		return 'a minute ago';
	} else if(delta < (45*60)) {
		return (parseInt(delta / 60)).toString() + ' minutes ago';
	} else if(delta < (90*60)) {
		return 'an hour ago';
	} else if(delta < (24*60*60)) {
		return '' + (parseInt(delta / 3600)).toString() + ' hours ago';
	} else if(delta < (48*60*60)) {
		return '1 day ago';
	} else {
		return (parseInt(delta / 86400)).toString() + ' days ago';
	}
}



// To prevent the "Console is undefined" bug
try { console.log('Console ready...'); } catch(e) { console = { log: function() {}}; }