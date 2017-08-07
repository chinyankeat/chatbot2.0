////////////////////////////////////////////////////////////
// Start: To setup the script, Install these packages
// 
// npm install --save botbuilder 
// npm install --save node-rest-client
// npm install --save mathjs
//
////////////////////////////////////////////////////////////

var builder = require('botbuilder');
var RestClient = require('node-rest-client').Client;
var restclient = new RestClient();
var math = require('mathjs');
var request = require("request");
var emoji = require('node-emoji');

////////////////////////////////////////////////////////////////////////////
// Botbuilder SDK Azure Extension
var azure = require('./lib/botbuilder-azure.js');
var azureTableClient = new azure.AzureTableClient(
	process.env.AZURE_TABLE_NAME, 
	process.env.AZURE_TABLE_ACCOUNT_NAME, 
	process.env.AZURE_TABLE_ACCOUNT_KEY);
var tableStorage = new azure.AzureBotStorage({ gzipData: false }, azureTableClient);


////////////////////////////////////////////////////////////////////////////
// API.ai
var apiai = require('apiai'); 
var apiai_app = apiai(process.env.APIAI_CLIENT_ACCESS_TOKEN);
var ApiAiIntroWebHook = 'Postpaid,what is the postpaid plans|Prepaid,what is the prepaid plans|Change Plan,i want to change plan';


////////////////////////////////////////////////////////////////////////////
// Global Variables
// Session Data
var DebugLoggingOn=0;
var LastMenu = 'LastMenu';
var DialogId = 'DialogId';
var DialogState = 'DialogState';
var imagedir = 'https://yellowchat.azurewebsites.net';
// Recommend State 0=Not recommending
//var PlanRecommendState = 'PlanRecommendState';
var FeedbackIntent = 'FeedbackIntent';
var ResponseTime = 'ResponseTime';
var ApiAiQuickReply = 'ApiAiQuickReply';
var Recommending = 1;
var RecommendPrepaidBest = 10;
var RecommendPrepaidLive = 11;
var RecommendPostpaidInfinite = 20;
var RecommendPostpaid110 = 21;
var RecommendPostpaid80 = 22;
var RecommendPostpaid50 = 23;
var RecommendPostpaidInfinite110 = 24;
var RecommendPostpaidSocialMedia = 30;

// Bot Retry Parameters
var MaxRetries = 1;
var MaxRetries_SingleMenu = 0;
var DefaultErrorPrompt = "Err... I didn't get that. Click on any of the above for help.";
var DefaultMaxRetryErrorPrompt = "Err... I didn't get that. Let's start again";
var AnyResponse = "blalala";    // any text
// API Gateway Variables
var ApiGwAuthToken = '';
var ApiGwAuthTokenExpiry = 0;
var ApiGwSmsCounter = 0;

var UrlList = [
		"https://appurl.io/j484erpc"									// 01 Download MyDigi
		,"http://new.digi.com.my/support/digi-store"					// 02 Digi Store Locator
		,"https://store.digi.com.my/storefront/reload-details.ep"		// 03
		,"http://new.digi.com.my/prepaid-plans"							// 04 Digi prepaid web
		,"http://new.digi.com.my/postpaid-plans"						// 05 Digi Postpaid web
		,"http://new.digi.com.my/prepaid-addons"						// 06
		,"http://new.digi.com.my/switch-to-digi"						// 07
		,"http://new.digi.com.my/business-overview"						// 08
		,"http://new.digi.com.my/bill-payment"							// 09
		,"http://new.digi.com.my/broadband"								// 10
		,"http://new.digi.com.my/broadband-devices"						// 11
		,"http://new.digi.com.my/roaming/roam-like-home-monthly"		// 12
		,"https://community.digi.com.my/t5/Apps-Services/Get-to-know-Connect-ID-All-you-need-to-know-and-more/ta-p/12838"
	];
	
	
	
	
////////////////////////////////////////////////////////////////////////////
// Initialization functions
// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};
// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [

    function (session) {
        session.beginDialog('menu');
        
        
    },
    function (session, results) {
        session.endConversation("Please type Menu");
    }
]).set('storage', tableStorage);


// start by getting API Gateway token first
//GetSmsAuthToken();
//GetSmsAuthToken2();
//setTimeout(function () { GenerateOtp3('0163372748');}, 2000);

// Initialize Telemetry Modules
var telemetryModule = require('./telemetry-module.js'); // Setup for Application Insights
var appInsights = require('applicationinsights');
var appInsightsClient = 0;
InitializeAppInsights();

function InitializeAppInsights(){
    try {
        appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
        appInsightsClient = appInsights.getClient();
    } catch (e) {
        console.log("Not connecting to AppInsights");
    }
}
////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////
// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                console.log("identity Added " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
                bot.beginDialog(message.address, 'intro');
            }
        });
    }
    if (message.membersRemoved){
        console.log("identity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        message.membersRemoved.forEach(function (identity) {
            console.log("identity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        });
    }
});

function logConversation(conversationId, dialogId, dialogState, dialogType, dialogInput, chatLog) {
    var options = {
        method: 'POST',
        url: process.env.CHATBOT_LOG_URL,
        qs: {       action: 'json' },
        headers: {  'content-type': 'multipart/form-data'   },
        formData: { 
            data: '{\
"command": "update_chat_log",\
"auth_key": "' + process.env.CHATBOT_LOG_AUTH_KEY+ '",\
"chat_id": "'  + conversationId+ '",\
"dialog_id": "'+ dialogId+ '",\
"dialog_state":"' + dialogState + '",\
"dialog_type":"' + dialogType + '",\
"dialog_input":"' + dialogInput + '",\
"chat_log": "'+chatLog+'"}'
        }
    };

	try{
		request(options, function (error, response, body) { // Send to DB if this is Production Environment
		})
	} catch (e) {
		console.log("cannot log to DB");                // Log if this is Production &Development Environment
	}
}


bot.dialog('YouThere', [(session)=>{
    session.dialogData.inactive = setTimeout(()=>{
        session.send('You there?');
		console.log('timeout');
    },3000)
}])

function ComplainChannels(session) {
	var now = new Date();
	currentTime = now.getHours()+8; // offset with GMT

//	if(currentTime>=10 && currentTime<=21) {//Between 10am-9pm, show livechat button
//		session.send("* Talk to us on Twitter : \n\n https://twitter.com/mydigi \n\n"
//					 + "* Call us at the Digi Helpline: \n\n 016-2211-800 \n\n"
//					 + "* Chat with our Human Agent");
//      var respCards = new builder.Message(session)
//            .attachmentLayout(builder.AttachmentLayout.carousel)
//            .attachments([
//                new builder.HeroCard(session)
//				.buttons([
//					builder.CardAction.openUrl(session, 'http://new.digi.com.my/webchat', 'Chat with Agent')
//				])
//					
//            ]);
//		session.send(respCards);		
//		
//	} else {
		session.send("* Talk to us on Twitter : \n\n https://twitter.com/mydigi \n\n"
					 + "* Call us at the Digi Helpline: \n\n 016-2211-800");
//	}
}


// Middleware for logging all sent & received messages
bot.use({
	
	// we receive message here
	botbuilder: function (session, next) {
		session.privateConversationData[ResponseTime] = Date.now();
		next();
	},	
	// we receive message here
    receive: function (event, next) {
		if(DebugLoggingOn) {
			console.log('Log:User [' + event.address.conversation.id + '] Typed[' + JSON.stringify(event) + ']');
		}
		// todo: log with session info
		if(event.text.length>0) {
			logConversation(event.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
							"Text In"/*Dialog Type*/, ""/*Dialog Input*/,event.text);
		}
        next();
    },
    send: function (event, next) {
		if(DebugLoggingOn) {
			console.log('Log:Bot [' + event.address.conversation.id +  '] Replied[' + JSON.stringify(event) + ']');
		}
		// todo: log with session info
		if(event.text!=undefined) {
			logConversation(event.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
							"Text Out"/*Dialog Type*/, ""/*Dialog Input*/,event.text);			
		} else {
			// no text, see if we have attachment
			try {
				var textString = "";
				if (event.attachments[0].content.text!=undefined) {
					textString += event.attachments[0].content.text;
				}
				if (event.attachments[0].content.title!=undefined) {
					textString += event.attachments[0].content.title;
				}
				//console.log('Log:Bot [' + event.address.conversation.id +  '] Replied[' + event.attachments[0].content.buttons[0].title + '][' + textString + ']');
				logConversation(event.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
								"Text Out"/*Dialog Type*/, event.attachments[0].content.buttons[0].title/*Dialog Input*/,textString);
			} catch (e) {
				//console.log('Log:Bot [' + event.address.conversation.id +  '] Replied[' + event.text + ']');
				logConversation(event.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
								"Text Out"/*Dialog Type*/, ""/*Dialog Input*/,event.text);
			}
		}
		next();
    }
});

function LogResponseTime(session) {
	var initialtime = session.privateConversationData[ResponseTime];

	if(initialtime>0) {
		var responseTime = Date.now() - initialtime;
		logConversation(session.message.address.conversation.id, 0/*Dialog ID*/,responseTime/*Dialog State*/,
						"ResponseTime"/*Dialog Type*/, ""/*Dialog Input*/,"");	
		session.privateConversationData[ResponseTime] = 0;
	}
}


// R - menu
bot.dialog('intro', [
    function (session) {
        // Initialize Session Data
		if(session.message==null) {
			session.message = 0;
		}
//		session.privateConversationData[PlanRecommendState] = 0;	// are we recommending something?
		session.privateConversationData[DialogId] = session.message.address.id;
		session.privateConversationData[ResponseTime] = 0;			// Track the response time
		session.privateConversationData[ApiAiQuickReply] = 0;		// store Api.ai Quick Reply Payload
		var request = apiai_app.textRequest("Let's Start", {
			sessionId: session.message.address.conversation.id
		});
		request.end();

		request.on('response', function(response) {
			ProcessApiAiResponse(session, response);
		});		
    }
]);

bot.dialog('logging-on', [
    function (session) {
		DebugLoggingOn = 1;
        session.send("Logging is on");
	}
]).triggerAction({
    matches: /^(chinyankeat on)$/i
});

bot.dialog('logging-off', [
    function (session) {
		DebugLoggingOn = 0;
        session.send("Logging is off");
	}
]).triggerAction({
    matches: /^(chinyankeat off)$/i
});


bot.dialog('getFeedbackGeneral', [
//    function (session) {
//		var respCards = new builder.Message(session)
//			.text("Was I able to help you?")
//			.suggestedActions(
//				builder.SuggestedActions.create(
//					session,[
//						builder.CardAction.imBack(session, "Yes", "Yes"),
//						builder.CardAction.imBack(session, "No", "No")
//					]
//				)
//			);
//        builder.Prompts.choice(session, respCards, "Yes|No", { maxRetries:MaxRetries_SingleMenu });
//	}
//	,function(session, results) {
//		switch (results.response.index) {
//			case 0:	// Yes
//				session.send("Always good to know :D");
//				logConversation(session.message.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
//								"Feedback"/*Dialog Type*/, session.privateConversationData[FeedbackIntent]/*Dialog Input*/,"Yes");
//				
//				// Add in tips after yes / no
//				var request = apiai_app.textRequest("Tips", {
//					sessionId: session.message.address.conversation.id
//				});
//				request.end();
//				request.on('response', function(response) {
//					ProcessApiAiResponse(session, response);
//				});
//				break;
//			case 1:	// No
//				session.send("Thanks for your feedback. We will improve on this");
//				logConversation(session.message.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
//								"Feedback"/*Dialog Type*/, session.privateConversationData[FeedbackIntent]/*Dialog Input*/,"No");
//				break;
//			default:
//				session.send("Can I help you with anything else?");
//				break;
//		}
//    }
]);


//// Digi Plan Recommendation
//bot.dialog('Plan-Recommendation', [
//    function (session) {
//		session.privateConversationData[FallbackState] = 0;	// to reset the Fallback State (people talking rubbish)
//        session.privateConversationData[PlanRecommendState] = Recommending;
//        var respCards = new builder.Message(session)
//            .text("What type of plan would you prefer?")
//            .suggestedActions(
//                builder.SuggestedActions.create(
//                    session,[
//                        builder.CardAction.imBack(session, "Pay as you go", "Pay as you go"),
//                        builder.CardAction.imBack(session, "Monthly Billing", "Monthly Billing")
//                    ]
//                )
//            );
//		session.send(respCards);
//	}
//]).triggerAction({
////    matches: /.*(recommend plan).*|.*(recommend me plan).*/i
//});
//
//bot.dialog('Plan-PayAsYouGo', [
//    function (session) {
//		session.privateConversationData[FallbackState] = 0;	// to reset the Fallback State (people talking rubbish)
//		session.privateConversationData[PlanRecommendState] = Recommending;
//		var respCards = new builder.Message(session)
//			.text("What would you usually use your data for?")
//			.suggestedActions(
//				builder.SuggestedActions.create(
//					session,[
//						builder.CardAction.imBack(session, "Social Media", "Social Media"),
//						builder.CardAction.imBack(session, "Music, Video Streaming", "Music, Video Streaming")
//					]
//				)
//			);
//		builder.Prompts.choice(session, respCards, "Social Media|Music, Video Streaming", { maxRetries:MaxRetries_SingleMenu});
//	}
//	,function(session, results) {
//		if(results.response==undefined){
//			session.endDialog();
//			session.replaceDialog('CatchAll');
//		} else {
//			switch (results.response.index) {
//				case 0:		// Social Media
//					session.privateConversationData[PlanRecommendState] = RecommendPrepaidBest;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Prepaid Best")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Best.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				case 1:		// Music, Video Streaming
//					session.privateConversationData[PlanRecommendState] = RecommendPrepaidLive;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Prepaid Live")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Live.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				default:
//					return;
//			}
//		}
//    }
//]).triggerAction({
//    matches: /(Pay as you go)/i
//});
//
//bot.dialog('Plan-MonthlyBilling', [
//    function (session) {
//		session.privateConversationData[FallbackState] = 0;	// to reset the Fallback State (people talking rubbish)
//		session.privateConversationData[PlanRecommendState] = Recommending;
//		var respCards = new builder.Message(session)
//			.text("How much data do you use monthly?")
//			.suggestedActions(
//				builder.SuggestedActions.create(
//					session,[
//						builder.CardAction.imBack(session, "More than 25GB", "More than 25GB"),
//						builder.CardAction.imBack(session, "21GB-25GB", "21GB-25GB"),
//						builder.CardAction.imBack(session, "11GB-20GB", "11GB-20GB"),
//						builder.CardAction.imBack(session, "Less than 10GB", "Less than 10GB"),
//						builder.CardAction.imBack(session, "I don't know", "I don't know")
//					]
//				)
//			);
//		builder.Prompts.choice(session, respCards, "More than 25GB|21GB-25GB|11GB-20GB|Less than 10GB|I don't know", { maxRetries:MaxRetries_SingleMenu});
//	}
//	,function(session, results) {
//		if(results.response==undefined){
//			session.replaceDialog('CatchAll');
//			session.endDialog();
//		} else {
//			switch (results.response.index) {
//				case 0:		// More than 25GB
//					session.privateConversationData[PlanRecommendState] = RecommendPostpaidInfinite;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid Infinite")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Infinite.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#online-exclusive-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				case 1:		// 21-25GB
//					session.privateConversationData[PlanRecommendState] = RecommendPostpaid110;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid 110")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-110.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				case 2:		// 11-20GB
//					session.privateConversationData[PlanRecommendState] = RecommendPostpaid80;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid 80")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-80.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				case 3:		// less than 10 GB
//					session.privateConversationData[PlanRecommendState] = RecommendPostpaid50;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid 50")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-50.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				default:	// I don't know
//					session.replaceDialog('Plan-RecommendPlanByStreaming');
//					return;
//			}
//		}
//    }
//]).triggerAction({
//    matches: /(Monthly Billing)/i
//});
//
//bot.dialog('Plan-RecommendPlanByStreaming', [
//    function (session) {
//		session.privateConversationData[FallbackState] = 0;	// to reset the Fallback State (people talking rubbish)
//		var respCards = new builder.Message(session)
//			.text("How often do you use streaming services like YouTube and Spotify?")
//			.suggestedActions(
//				builder.SuggestedActions.create(
//					session,[
//						builder.CardAction.imBack(session, "Very often", "Very often"),
//						builder.CardAction.imBack(session, "Not much", "Not much")
//					]
//				)
//			);
//		builder.Prompts.choice(session, respCards, "Very often|Not much", { maxRetries:MaxRetries_SingleMenu});
//	}
//	,function(session, results) {
//		switch (results.response.index) {
//			case 0:		// Very Often
//				session.privateConversationData[PlanRecommendState] = RecommendPostpaidInfinite110;
//				session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//				var respCards = new builder.Message(session)
//					.attachmentLayout(builder.AttachmentLayout.carousel)
//					.attachments([
//						new builder.HeroCard(session)
//						.title("Digi Postpaid Infinite")
//						.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Infinite.jpg') ])
//						.buttons([
//							builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#online-exclusive-plans', 'Find Out More')
//						])
//
//						,new builder.HeroCard(session)
//						.title("Digi Postpaid 110")
//						.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-110.jpg') ])					
//						.buttons([
//							builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//						])
//					]);
//				session.send(respCards);
//				break;
//			default:	// Not Much
//				session.replaceDialog('Plan-RecommendPlanBySocialMedia');
//				return;
//		}
//    }
//]);
//	
//bot.dialog('Plan-RecommendPlanBySocialMedia', [
//    function (session) {
//		session.privateConversationData[FallbackState] = 0;	// to reset the Fallback State (people talking rubbish)
//		var respCards = new builder.Message(session)
//			.text("Do you use social media (e.g. Facebook, Twitter) often?")
//			.suggestedActions(
//				builder.SuggestedActions.create(
//					session,[
//						builder.CardAction.imBack(session, "Very often", "Very often"),
//						builder.CardAction.imBack(session, "Not much", "Not much")
//					]
//				)
//			);
//		builder.Prompts.choice(session, respCards, "Very often|Not much", { maxRetries:MaxRetries_SingleMenu});
//	}
//	,function(session, results) {
//		if(results.response==undefined){
//			session.replaceDialog('CatchAll');
//			session.endDialog();
//		} else {
//			switch (results.response.index) {
//				case 0:		// Very Often
//				session.privateConversationData[PlanRecommendState] = RecommendPostpaid80;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid 80")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-80.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//				default:	// Not Much
//					session.privateConversationData[PlanRecommendState] = RecommendPostpaid50;
//					session.send("I think this will be a good plan for you. You can also upgrade your plan at any time. Just let us know.");
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.title("Digi Postpaid 50")
//							.images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-50.jpg') ])
//							.buttons([
//								builder.CardAction.openUrl(session, 'https://new.digi.com.my/postpaid-plans#best-value-plans', 'Find Out More')
//							])
//						]);
//					session.send(respCards);
//					break;
//			}
//		}
//    }
//]);
//
//bot.dialog('Roaming-General', [
//    function (session, args) {
//		
//		if(args.result.actionIncomplete==true){
//			
//			// If user answer unknown items many times, just cancel the current request to API.ai
//			if(session.privateConversationData[FallbackState] >2){
//				var request = apiai_app.textRequest("Cancel", {
//					sessionId: session.message.address.conversation.id
//				});
//				request.end();
//				session.privateConversationData[FallbackState] = 1;
//				
//				//session.replaceDialog('Default-Fallback-Intent');
//				session.send("I'm sorry I don't understand. Maybe you want to check the roaming rates using our website");
//				var respCards = new builder.Message(session)
//					.attachmentLayout(builder.AttachmentLayout.carousel)
//					.attachments([
//						new builder.HeroCard(session)
//						.text("List of Roaming Countries")
//						.buttons([
//							builder.CardAction.openUrl(session, "http://new.digi.com.my/roaming/international-roaming-rates", 'Check  Rates')
//						])
//					]);					
//				session.send(respCards);
//				return;
//			}
//
//			// now display the responses
//			if(args.result.fulfillment.speech.length>0) {
//				if(args.result.fulfillment.speech.search("postpaid")>=0) {
//					session.privateConversationData[FallbackState] = 0;// reset to 0
//					var respCards = new builder.Message(session)
//						.text(args.result.fulfillment.speech)
//						.suggestedActions(
//							builder.SuggestedActions.create(
//								session,[
//									builder.CardAction.imBack(session, "Postpaid", "Postpaid"),
//									builder.CardAction.imBack(session, "Prepaid", "Prepaid"),
//								]
//							)
//						);
//					session.send(respCards);
//				} else {
//					session.send(args.result.fulfillment.speech);
//				}
//			}
//		} else {
//			// our flow is complete
//			session.privateConversationData[FallbackState] = 0;			
//			
//			// display the result
//			if(args.result.fulfillment.speech.length>0) {
//				// parse the string for country name, and display the result as "Roaming in Taiwan" 
//				var httpLocation = args.result.fulfillment.speech.search("http");
//				var httpString = args.result.fulfillment.speech.substring(httpLocation,args.result.fulfillment.speech.length);
//				var countryLocation = args.result.fulfillment.speech.search("country=");
//				var countryString = args.result.fulfillment.speech.substring(countryLocation+8,args.result.fulfillment.speech.length);
//
//				// replace camelcase with Caps... e.g. SouthKorea --> South Korea
//				var countryString2 = countryString
//					// insert a space before all caps
//					.replace(/([a-z])([A-Z])/g, '$1 $2');
//				
//				if(httpLocation>=0) {
//					var respCards = new builder.Message(session)
//						.attachmentLayout(builder.AttachmentLayout.carousel)
//						.attachments([
//							new builder.HeroCard(session)
//							.text(args.result.fulfillment.speech.substring(0,httpLocation-1))
//							.buttons([
//								builder.CardAction.openUrl(session, httpString, 'Roaming in '+countryString2)
//							])
//						]);					
//					session.send(respCards);
//				} else {
//					session.send(args.result.fulfillment.speech);
//				}
////				session.replaceDialog("getFeedbackGeneral");
//			}
//		}
//    }
//]).triggerAction({
//    matches: /(Monthly Billing)/i
//});

// Redirect all to fallback intent
bot.dialog('Default-Unknown', [
    function (session, args) {
		session.replaceDialog('Default-Fallback-Intent',args);
	}
]);

//bot.dialog('Default-Fallback-Intent', [
//    function (session, args) {
//		//console.log('API.AI response in dialog:'+ JSON.stringify(args.result));		
//		switch(session.privateConversationData[FallbackState]){
//			case 1:
//				session.send("I don't quite get you. " +
//							 "\n\n Can you try saying that in a different way? I might be able to help you better.");
//				break;
//			case 2:
//				session.send("Hmmm. I don't think I know that. " + 
//				"\n\nCan you try saying it in a different way? ");
//				break;
//			case 3:
//			case 4:
//			case 5:
//				session.privateConversationData[FallbackState] = 0;				
//				var respCards = new builder.Message(session)
//					.text("I don't understand that. Would you like to talk one of my Human Friends?")
//					.suggestedActions(
//						builder.SuggestedActions.create(
//							session,[
//								builder.CardAction.imBack(session, "Yes", "Yes"),
//								builder.CardAction.imBack(session, "No", "No")
//							]
//						)
//					);
//				builder.Prompts.choice(session, respCards, "Yes|No", { maxRetries:MaxRetries_SingleMenu});				
//				break;
//			default:
//				session.send("I don't quite get you. " +
//							 "\n\n Can you try saying that in a different way? I might be able to help you better.");
//				session.privateConversationData[FallbackState] = 0;
//				break;
//		}
//    }
//	,function(session, results) {
//		switch (results.response.index) {
//			case 0:	// Yes
//				ComplainChannels(session);
//				break;
//			case 1:	// No
//				session.send("Alright. Can I help you with anything else?");
//				break;
//			default:
//				break;
//		}			
//		session.endDialog();
//    }
//]);

bot.dialog('Start-Over', [
    function (session) {
		var request = apiai_app.textRequest("Cancel", {
			sessionId: session.message.address.conversation.id
		});
		request.end();
		session.send("Alright. Let's start over");
		session.send('\n\n Ask me about plans, roaming and stuff about your account. eg." What is infinite?"');
		session.send('How may I help you today? ');
    }
]).triggerAction({
    matches: /(Start Over).*|(Cancel).*/i
});

bot.dialog('printenv', [
    function (session) {
		session.send("here are the settings: ");
		session.send(" ♥ APP_SECRET:" + process.env.APP_SECRET +
					" \n\n APIGW_URL:" + process.env.APIGW_URL +
					" \n\n APIGW_SMS_AUTH_CLIENT_ID:" + process.env.APIGW_SMS_AUTH_CLIENT_ID +
					" \n\n APIGW_SMS_AUTH_CLIENT_SECRET:" + process.env.APIGW_SMS_AUTH_CLIENT_SECRET +
					" \n\n CHATBOT_LOG_AUTH_KEY:" + process.env.CHATBOT_LOG_AUTH_KEY +
					" \n\n CHATBOT_LOG_URL:" + process.env.CHATBOT_LOG_URL +
					" \n\n APPINSIGHTS_INSTRUMENTATIONKEY:" + process.env.APPINSIGHTS_INSTRUMENTATIONKEY +
					" \n\n OFFLINE:" + process.env.OFFLINE +
					" \n\n DEVELOPMENT:" + process.env.DEVELOPMENT +
					" \n\n APIAI_CLIENT_ACCESS_TOKEN:" + process.env.APIAI_CLIENT_ACCESS_TOKEN);
	}
]).triggerAction({
    matches: /^(printEnv)$/
});

function ProcessApiAiResponseIntro(session, response) {
	
//	if(DebugLoggingOn) {
		console.log('API.AI response:'+ JSON.stringify(response));
//	}
	try {

		if (response.result.fulfillment.data != null){
			// This block of text is for API.ai webhook Facebook messages
			// we need to store payload for each content
			if(response.result.fulfillment.data.facebook != null) {
				
				if(response.result.fulfillment.data.facebook.quick_replies.length > 0) {
					var ApiAiQuickReplyTextPayload = "";

					var QuickReplyText = response.result.fulfillment.data.facebook.text;
					var QuickReplyButtons = [];
					
					for(idx=0; idx<response.result.fulfillment.data.facebook.quick_replies.length; idx++) {

						var QuickReplyTitle = response.result.fulfillment.data.facebook.quick_replies[idx].title;
						var QuickReplyPayload = response.result.fulfillment.data.facebook.quick_replies[idx].payload;
						
						var wwwLocation = response.result.fulfillment.data.facebook.quick_replies[idx].payload.search("http");
						if (wwwLocation>=0){
							// URL includes http://
							QuickReplyButtons.push(
								builder.CardAction.openUrl(session, QuickReplyPayload, QuickReplyTitle));							
						} else {
							QuickReplyButtons.push(
								builder.CardAction.imBack(session, QuickReplyTitle, QuickReplyTitle));
						}
						if(ApiAiQuickReplyTextPayload.length>0) {
							ApiAiQuickReplyTextPayload += '|' + QuickReplyTitle + ',' + QuickReplyPayload;
						} else {
							ApiAiQuickReplyTextPayload += QuickReplyTitle + ',' + QuickReplyPayload;
						}
					}

//					ApiAiIntroWebHook = ApiAiQuickReplyTextPayload;

					var respCards = new builder.Message(session)
						.text(QuickReplyText)
						.suggestedActions(
							builder.SuggestedActions.create(
								session,QuickReplyButtons
							)
						);
					session.send(respCards);					
					
				} else {
					session.send(response.result.fulfillment.data.facebook.text);
				}
			}
		} else {
			// No Facebook Message. we only have normal message. output only normal string
			// Print out each individual Messages
			var jsonObjectMsg = response.result.fulfillment.messages.filter(value=> {return value.type==0 && value.platform==null});
			if(jsonObjectMsg) {
				for(idx=0; idx<jsonObjectMsg.length; idx++) {
					if(jsonObjectMsg[idx].speech.length >0) {
						session.send(jsonObjectMsg[idx].speech);
					}
				}
			}
		}
	} catch (e) {
		console.log("ProcessApiAiResponse Error: [" + JSON.stringify(response.result) + ']');
	}	
}


function ProcessApiAiResponse(session, response) {
	
	if(DebugLoggingOn) {
		console.log('API.AI response:'+ JSON.stringify(response));
		session.send('API.AI response:'+ JSON.stringify(response));
	}
	try {
		var jsonobject = response.result.fulfillment.messages.filter(value=> {return value.platform=='facebook'});
		if(jsonobject.length>0) {

			// We have FB Text
			var jsonFbText = response.result.fulfillment.messages.filter(value=> {return value.type==0 && value.platform=='facebook'});
			if(jsonFbText.length>0) {
				for(idx=0; idx<jsonFbText.length; idx++){
					if(jsonFbText[idx].speech.length >0) {
						session.send(jsonFbText[idx].speech);
					}
				}
			}

			// We have FB Card. Put all cards into carousel
			var jsonFbCard = response.result.fulfillment.messages.filter(value=> {return value.type==1 && value.platform=='facebook'});
			var CardAttachments = [];
			if(jsonFbCard.length>0) {
				for(idx=0; idx<jsonFbCard.length; idx++){
					var CardButtons = [];
					if(jsonFbCard[idx].buttons!=null) {
						for (idxButton=0; idxButton<jsonFbCard[idx].buttons.length; idxButton++) {
							// Check if quick reply is it HTTP or normal string
							wwwLocation = jsonFbCard[idx].buttons[idxButton].postback.search("http");
							if(wwwLocation>=0){
								// URL includes http://
								CardButtons.push(
									builder.CardAction.openUrl(session, jsonFbCard[idx].buttons[idxButton].postback, jsonFbCard[idx].buttons[idxButton].text));
							} else {
								// Button is normal imBack
								CardButtons.push(
									builder.CardAction.imBack(session, jsonFbCard[idx].buttons[idxButton].postback, jsonFbCard[idx].buttons[idxButton].text));
							}
						}
						CardAttachments.push(
							new builder.HeroCard(session)
							.title(jsonFbCard[idx].title)
							.text(jsonFbCard[idx].subtitle)
							.images([ builder.CardImage.create(session, jsonFbCard[idx].imageUrl) ])
							.buttons(CardButtons)
						);
					} else {
						CardAttachments.push(
							new builder.HeroCard(session)
							.title(jsonFbCard[idx].title)
							.text(jsonFbCard[idx].subtitle)
							.images([ builder.CardImage.create(session, jsonFbCard[idx].imageUrl) ])
						);									
					}
				}
			}

			// we have Facebook Quick Reply. Put as quickreply							
			var jsonFbQuickReply = response.result.fulfillment.messages.filter(value=> {return value.type==2 && value.platform=='facebook'});
			var QuickReplyButtons = [];
			var QuickReplyText = "";
			if(jsonFbQuickReply.length>0) {
				for(idx=0; idx<jsonFbQuickReply.length; idx++){
					for (idxQuickReply=0; idxQuickReply<jsonFbQuickReply[idx].replies.length; idxQuickReply++) {

						// Check if we have escape keys
						var urlLocation = jsonFbQuickReply[idx].replies[idxQuickReply].search('-L');
						var urlTitle = jsonFbQuickReply[idx].replies[idxQuickReply].substring(0,urlLocation);
						var urlString = "";
						var wwwLocation = jsonFbQuickReply[idx].replies[idxQuickReply].search("http");
						
						// Add in our predetermined URL
						if(urlLocation>=0) {
							var urlReplies = jsonFbQuickReply[idx].replies[idxQuickReply];
							var selectedUrl = parseInt(urlReplies.substring(urlLocation+2,urlReplies.length)) - 1;
							if (UrlList.length > selectedUrl) {
								urlString = UrlList[selectedUrl];
								QuickReplyButtons.push(
									builder.CardAction.openUrl(session, urlString, urlTitle));
							}
						} else if (wwwLocation>=0){
							// URL includes http://
							QuickReplyButtons.push(
								builder.CardAction.openUrl(session, jsonFbQuickReply[idx].replies[idxQuickReply], jsonFbQuickReply[idx].replies[idxQuickReply]));							
						} else {
							QuickReplyButtons.push(
								builder.CardAction.imBack(session, jsonFbQuickReply[idx].replies[idxQuickReply], jsonFbQuickReply[idx].replies[idxQuickReply]));
						}
					}
				}
				QuickReplyText = jsonFbQuickReply[0].title;
			}
			
			// We have FB Images			
			var jsonFbImage = response.result.fulfillment.messages.filter(value=> {return value.type==3 && value.platform=='facebook'});
			if(jsonFbImage.length>0) {
				for(idx=0; idx<jsonFbImage.length; idx++){
					CardAttachments.push(
						new builder.HeroCard(session)
						.images([ builder.CardImage.create(session, jsonFbImage[idx].imageUrl) ])
					);									
				}
			}

			if(CardAttachments.length>0) {
				var respCards = new builder.Message(session)
					.attachmentLayout(builder.AttachmentLayout.carousel)
					.attachments(CardAttachments)
					.suggestedActions(
						builder.SuggestedActions.create(
							session,QuickReplyButtons
						)
					);
				session.send(respCards);
			} else  {
				var respCards = new builder.Message(session)
					.attachmentLayout(builder.AttachmentLayout.carousel)
					.text(QuickReplyText)
					.suggestedActions(
						builder.SuggestedActions.create(
							session,QuickReplyButtons
						)
					);
				session.send(respCards);
			}
			
		} else if (response.result.fulfillment != null){
			// This block of text is for API.ai webhook Facebook messages
			// we need to store payload for each content
			if(response.result.fulfillment.data != null) {
				if(response.result.fulfillment.data.facebook != null) {

					if(response.result.fulfillment.data.facebook.quick_replies.length > 0) {
						var ApiAiQuickReplyTextPayload = "";

						var QuickReplyText = response.result.fulfillment.data.facebook.text;
						var QuickReplyButtons = [];

						for(idx=0; idx<response.result.fulfillment.data.facebook.quick_replies.length; idx++) {

							var QuickReplyTitle = response.result.fulfillment.data.facebook.quick_replies[idx].title;
							var QuickReplyPayload = response.result.fulfillment.data.facebook.quick_replies[idx].payload;

							var wwwLocation = response.result.fulfillment.data.facebook.quick_replies[idx].payload.search("http");
							if (wwwLocation>=0){
								// URL includes http://
								QuickReplyButtons.push(
									builder.CardAction.openUrl(session, QuickReplyPayload, QuickReplyTitle));							
							} else {
								QuickReplyButtons.push(
									builder.CardAction.imBack(session, QuickReplyTitle, QuickReplyTitle));
							}
							if(ApiAiQuickReplyTextPayload.length>0) {
								ApiAiQuickReplyTextPayload += '|' + QuickReplyTitle + ',' + QuickReplyPayload;
							} else {
								ApiAiQuickReplyTextPayload += QuickReplyTitle + ',' + QuickReplyPayload;
							}
						}

						if(DebugLoggingOn) {
							session.send("QuickReply Store:"+ApiAiQuickReplyTextPayload);
						}

						session.privateConversationData[ApiAiQuickReply] = ApiAiQuickReplyTextPayload;

						var respCards = new builder.Message(session)
							.text(QuickReplyText)
							.suggestedActions(
								builder.SuggestedActions.create(
									session,QuickReplyButtons
								)
							);
						session.send(respCards);		
					} else {
						session.send(response.result.fulfillment.data.facebook.text);
					}
				} else {
					session.send(response.result.fulfillment.messages.speech);
				}
			} else {
				var jsonObjectMsg = response.result.fulfillment.messages.filter(value=> {return value.type==0});
				if(jsonObjectMsg) {
					for(idx=0; idx<jsonObjectMsg.length; idx++) {
						if(jsonObjectMsg[idx].speech.length >0) {
							session.send(jsonObjectMsg[idx].speech);
						}
					}
				}
				var jsonObjectMsg = response.result.fulfillment.messages.filter(value=> {return value.type==3});
				if(jsonObjectMsg) {
					//images here
					var CardAttachments = [];
					if(jsonObjectMsg.length>0) {
						for(idx=0; idx<jsonObjectMsg.length; idx++){
							CardAttachments.push(
								new builder.HeroCard(session)
								.images([ builder.CardImage.create(session, jsonObjectMsg[idx].imageUrl) ])
							);									
						}
						if(CardAttachments.length>0) {
							var respCards = new builder.Message(session)
								.attachmentLayout(builder.AttachmentLayout.carousel)
								.attachments(CardAttachments)
								.suggestedActions(
									builder.SuggestedActions.create(
										session,QuickReplyButtons
									)
								);
							session.send(respCards);
						} else  {
							var respCards = new builder.Message(session)
								.attachmentLayout(builder.AttachmentLayout.carousel)
								.text(QuickReplyText)
								.suggestedActions(
									builder.SuggestedActions.create(
										session,QuickReplyButtons
									)
								);
							session.send(respCards);
						}
					}
				}
			}						
		} else {
			// No Facebook Message. we only have normal message. output only normal string
			// Print out each individual Messages
			var jsonObjectMsg = response.result.fulfillment.messages.filter(value=> {return value.type==0 && value.platform==null});
			if(jsonObjectMsg) {
				for(idx=0; idx<jsonObjectMsg.length; idx++) {
					if(jsonObjectMsg[idx].speech.length >0) {
						session.send(jsonObjectMsg[idx].speech);
					}
				}
			}
		}
	} catch (e) {
		console.log("ProcessApiAiResponse Error: [" + JSON.stringify(response.result) + ']');
		session.send("Hi, I am Will, your Digi Virtual Assistant.How may I help you today?");
	}	
}

function ProcessApiAiAndAddButton(session, response) {
	if(DebugLoggingOn) {
		console.log('API.AI, add Button:'+ JSON.stringify(response));
	}
	try {
		// Print out each individual Messages
		var jsonObjectMsg = response.result.fulfillment.messages.filter(value=> {return value.type==0 && value.platform==null});
		if(jsonObjectMsg) {
			for(idx=0; idx<(jsonObjectMsg.length-1); idx++) {
				if(jsonObjectMsg[idx].speech.length >0) {
					session.send(jsonObjectMsg[idx].speech);
				}
			}
			// Last Message, add in button, either Download MyDigi / Go to Store
			if(jsonObjectMsg[jsonObjectMsg.length-1].speech.search("MyDigi")>=0) {
				var respCards = new builder.Message(session)
					.text(jsonObjectMsg[jsonObjectMsg.length-1].speech)
					.suggestedActions(
						builder.SuggestedActions.create(
							session,[
								builder.CardAction.openUrl(session, 'https://appurl.io/j484erpc', 'Download MyDigi'),
							]
						)
					);
				session.send(respCards);				
			} else {
				var respCards = new builder.Message(session)
					.text(jsonObjectMsg[jsonObjectMsg.length-1].speech)
					.suggestedActions(
						builder.SuggestedActions.create(
							session,[
								builder.CardAction.openUrl(session, 'http://new.digi.com.my/support/digi-store', 'Find a store'),
							]
						)
					);
				session.send(respCards);				
			}
		}
	} catch (e) {
		console.log("ProcessApiAiAndAddButton Error: [" + JSON.stringify(response.result) + ']');
	}	
}

bot.dialog('CatchAll', [
    function (session) {
		// Reset any conversation state
//		session.privateConversationData[PlanRecommendState] = 0;
		
		// send the request to API.ai
		// Senc request to API.ai using quickreply payload if we have it
		var request = 0;
		if(DebugLoggingOn) {
			session.send("QuickReply Load: "+session.privateConversationData[ApiAiQuickReply]);
		}

		if (session.privateConversationData[ApiAiQuickReply] == undefined){
			var FoundQuickReply = 0;
			var thisstring = ApiAiIntroWebHook;
			var res = thisstring.split("|");
			session.privateConversationData[ApiAiQuickReply] = 0;

			for(idx=0; idx<res.length; idx++) {
				if(res[idx].search(session.message.text)>=0) {
					var CurrentQuickReply = res[idx].split(",");
					request = apiai_app.textRequest(CurrentQuickReply[1], {
						sessionId: session.message.address.conversation.id
					});
					request.end();
					if(DebugLoggingOn) {
						session.send("1. Sending to API.ai : " + CurrentQuickReply[1]);
					}
					FoundQuickReply = 1;
				}
			}

			// we cannot find the quickreply. Send the custom text
			if(FoundQuickReply==0) {
				request = apiai_app.textRequest(session.message.text, {
					sessionId: session.message.address.conversation.id
				});
				request.end();
				if(DebugLoggingOn) {
					session.send("2. Sending to API.ai : " + session.message.text);
				}
			}
		} else if(session.privateConversationData[ApiAiQuickReply] != 0) {
			var FoundQuickReply = 0;
			var thisstring = session.privateConversationData[ApiAiQuickReply] + "";
			var res = thisstring.split("|");
			session.privateConversationData[ApiAiQuickReply] = 0;

			for(idx=0; idx<res.length; idx++) {
				if(res[idx].search(session.message.text)>=0) {
					var CurrentQuickReply = res[idx].split(",");
					request = apiai_app.textRequest(CurrentQuickReply[1], {
						sessionId: session.message.address.conversation.id
					});
					request.end();
					if(DebugLoggingOn) {
						session.send("3. Sending to API.ai : " + CurrentQuickReply[1]);
					}
					FoundQuickReply = 1;
				}
			}

			// we cannot find the quickreply. Send the custom text
			if(FoundQuickReply==0) {
				request = apiai_app.textRequest(session.message.text, {
					sessionId: session.message.address.conversation.id
				});
				request.end();
				if(DebugLoggingOn) {
					session.send("4. Sending to API.ai : " + session.message.text);
				}
			}
		} else {
			request = apiai_app.textRequest(session.message.text, {
				sessionId: session.message.address.conversation.id
			});
			request.end();				
			if(DebugLoggingOn) {
				session.send("5. Sending to API.ai : " + session.message.text);
			}
		}

		request.on('response', function(response) {
			if(DebugLoggingOn) {
				session.send("Received Response ");
			}
			if(response.result.action==undefined){
				session.send("Let's get back to our chat on Digi");
			} else {		// We have response from API.AI
				if(DebugLoggingOn) {
					console.log("API.AI [" +response.result.resolvedQuery + '][' + response.result.action + '][' + response.result.score + ']['  + response.result.fulfillment.speech + '][' + response.result.metadata.intentName + ']');	
				}
				logConversation(session.message.address.conversation.id, 0/*Dialog ID*/,0/*Dialog State*/,
								"Intent"/*Dialog Type*/, ""/*Dialog Input*/,response.result.metadata.intentName);					

				//console.log('API.AI response text:'+ response.result.fulfillment.speech);
				//console.log('API.AI response:'+ JSON.stringify(response.result));

				// Flow when API.ai returns
				// 1) Try to call the intent & pass the JSON to the intent 
				// 2) If intent not exist, check if there is fulfillment speech and display that default speech
				// 3) If fulfillment speech does not exist, display default "Let's get back to our chat on Digi" 
				try {
					console.log("CatchAll: API.ai Intent [" + response.result.metadata.intentName +"]");
					ProcessApiAiResponse(session, response);
					LogResponseTime(session);
					return;
				} catch (e) {
					session.send("Hi, I am Will, your Digi Virtual Assistant.How may I help you today?")
					LogResponseTime(session);
				}
			}
		});
		request.on('error', function(error) {
			console.log('API.AI error:'+error);
			session.send("Let's get back to our chat on Digi");
			LogResponseTime(session);
		});

	}
]).triggerAction({
    matches: /^.*$/i
});


// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link 
        connectorListener(req, res);
    };
}

module.exports = {
    listen: listen,
};





