"use strict";

// ============================================================
// Show feedback after 15 seconds idle
var feedbackIdleTime = 0;
var idleInterval = 0;
var feedbackTimerStarted = 0;	
var botInteraction = 0;	// current interactions

// Popup for feedback under the following conditions 
var feedbackPopupShown = 0;			// Has we popup dialog before? 0=no, 1=yes
var feedbackPopupInteraction = 20;	// popup after 15 interactions
var feedbackPopupTimer = 40;		// popup after 60 seconds idle

// Counters for Typing Timer
var typingTimerHandler = 0;	// store callback function for Typing Timer
var typingTimer = 0;			// how long we have typing ...? 
var currentBotText = "Let's Start";

var variable_1 = 0;
var variable_2 = 0;
var variable_3 = 0;
var variable_4 = 0;
var variable_5 = 0;
var variable_6 = 0;
var variable_7 = 0;
var variable_8 = 0;
var variable_9 = 0;
var variable_10 = 0;


$( document ).ready(function() {
	// function to popup feedback menu
	//Zero the idle timer on mouse movement.
    $(this).mousemove(function (e) {
        feedbackIdleTime = 0;
    });
    $(this).keypress(function (e) {
        feedbackIdleTime = 0;
    });
	
	// timer for typing
	typingTimerHandler = setInterval(typingTimerCallback, 1000); // 6 second		

	
	// function to handle password screen
	$("#login_submit").on("click", function () {
		verify_login($("#username").val(), $("#password").val());
	});
	$("#login_cancel").on("click", function () {
		window.location.replace("http://www.digi.com.my");  
	});	
});

function typingTimerCallback() {
	if(typingTimer>0) {
		var elapsedTime = (Date.now() - typingTimer)/1000;
		if(elapsedTime>10) {	// Elapsed more than 10 seconds
			if(currentBotText == "Let's Start") {
				cancelTypingTimer();
				location.reload(true);
			} else {
				cancelTypingTimer();
//				$("#wc-resend-message").trigger( "click");	// this will trigger bot to resend the last message

				var dotdotdot = document.getElementById('wc-loading-container-id');
				if(dotdotdot){
					dotdotdot.parentNode.removeChild(dotdotdot);
				}

				// this code replaces child, but it will disappear if new text typed. 
//				var dotdotdot = document.getElementById("wc-loading-container-id");
//				if(dotdotdot) {
//					var typingErrorImg = document.createElement("IMG");
//					typingErrorImg.className = 'wc-loading-container';
//					typingErrorImg.setAttribute("src", "http://bot.digi.com.my/images/typingerror.png");
//					dotdotdot.parentNode.replaceChild(typingErrorImg,dotdotdot);
//				}
			}
		}
	}
}

function startTypingTimer() {
	typingTimer = Date.now();
}

function cancelTypingTimer() {
	typingTimer = 0;
}


$('body').keyup(function(e){
    if(e.which == 27){
		$('#wc-popup-url').fadeOut(200);
		$("#wc-popup-feedback").fadeOut(200);		
    }
});

$('body.a').on('click',function(){
	alert("abce : " + $(this).attr('href'));
//    $(this).attr('href', $(this).attr('href'));
});

function startFeedbackTimer() {
	botInteraction++;
	
	if((botInteraction == feedbackPopupInteraction) && !feedbackPopupShown) {
		feedbackPopupShown++;
//		$("#wc-popup-feedback").fadeIn(150);
		clearInterval(idleInterval);
	}
	
	if(!feedbackTimerStarted) {	// only start feedback timer once, after user had the first interaction with bot
		feedbackTimerStarted++;
		//Increment the idle time counter every second.
		idleInterval = setInterval(timerIncrement, 1000); // 1 second		
	}
}

function timerIncrement() {
    feedbackIdleTime++;
    if (feedbackIdleTime >= feedbackPopupTimer) { // Popup after certain timer
		if(!feedbackPopupShown) {
			feedbackPopupShown++;
//			$("#wc-popup-feedback").fadeIn(150);	// Comment / uncomment this line to enable feedback. Temporary disable this feedback
			clearInterval(idleInterval);			
		}
    }
}

function submitFeedback() {
	if ($("#popup-feedback-stars :radio:checked").val() == undefined ) {
		$('#popup-feedback-comment').text("Please help to rate us");
		return;
	}

	// Send Update Feedback to our database
	var form = new FormData();
	form.append("data", "{\"command\": \"update_chat_log\",\"auth_key\": \"a6hea2\",\"chat_id\": \"rating\",\n\"dialog_id\":\"rating\",\"dialog_state\":\"1\",\"dialog_type\":\"text\",\"dialog_input\":\""+$("#popup-feedback-stars :radio:checked").val()+" star"+"\",\"chat_log\": \""+$("#popup-feedback-remark").val()+"\"}");

	var settings = {
	  "async": true,
	  "url": "https://digibid.azurewebsites.net/action.ashx?action=json",
	  "method": "POST",
	  "processData": false,
	  "contentType": false,
	  "mimeType": "multipart/form-data",
	  "data": form
	}

	$.ajax(settings).done(function (response) {
	  console.log(response);
	});	

	$("#wc-popup-feedback").hide();
	$('#wc-popup-feedback-thankyou').show();
	setTimeout( hideFeedbackThankYou, 2000);	// hide thank you after 2 seconds
}

function hideFeedbackThankYou() {
	$('#wc-popup-feedback-thankyou').fadeOut(150)
}


function verify_login(username,password) {
	var command = {};
	command["command"] = "bot_user_login";
	command["username"] = username;
	command["password"] = password

	$.ajax({
		type: "POST",
		url: 'https://digibid.azurewebsites.net/action.ashx?action=json',
		data: {
			data: JSON.stringify(command)
		},
		cache: false,
		async: true,
		timeout: 10000,
		success: function (data) {
			if (data.results.status == '0') {
				$("#passwordcontainer").hide();

				var form = new FormData();
				form.append("data", "{\"command\": \"update_chat_log\",\"auth_key\": \"a6hea2\",\"chat_id\": \"login\",\n\"dialog_id\":\"login-success\",\"dialog_state\":\"1\",\"dialog_type\":\"text\",\"dialog_input\":\"\",\"chat_log\": \"username:"+username+"\"}");

				var settings = {
				  "async": true,
				  "url": "https://digibid.azurewebsites.net/action.ashx?action=json",
				  "method": "POST",
				  "processData": false,
				  "contentType": false,
				  "mimeType": "multipart/form-data",
				  "data": form
				}
				$.ajax(settings).done(function (response) {
				  console.log(response);
				});								

			} else {
				var form = new FormData();
				form.append("data", "{\"command\": \"update_chat_log\",\"auth_key\": \"a6hea2\",\"chat_id\": \"login\",\n\"dialog_id\":\"login-fail\",\"dialog_state\":\"1\",\"dialog_type\":\"text\",\"dialog_input\":\"\",\"chat_log\": \"username:"+username+"\"}");

				var settings = {
				  "async": true,
				  "url": "https://digibid.azurewebsites.net/action.ashx?action=json",
				  "method": "POST",
				  "processData": false,
				  "contentType": false,
				  "mimeType": "multipart/form-data",
				  "data": form
				}						
				$.ajax(settings).done(function (response) {
				  console.log(response);
				});
				alert("Wrong Username OR password");
				window.location.replace("http://www.digi.com.my");
			}
		},
		error: function (data) {
			window.location.replace("http://www.digi.com.my");
		}
	});
} 