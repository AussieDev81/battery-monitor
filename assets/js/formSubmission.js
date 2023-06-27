
const feedbackForm = document.getElementById("feedback-form");
const SITE_EMAIL = "aussiedev81@gmail.com";
const EMAILJS_PUBLIC_KEY = "oKjtk3d35PlskoYhd";
const goHome = () => (window.location = "index.html");
document.getElementById("hp-phone").style.display = "none";

window.onload = () => {
	emailjs.init(EMAILJS_PUBLIC_KEY);
};

const setSendButtonText = (text = "Submit") => {
	const sendButton = document.getElementById("send-btn");
	sendButton.value = text;
};

const showSubmitConfirmation = (form) => {
	let name = form["name"].value;
	let message = `Thanks${
		name === "" ? "!" : ` ${name}!`
	}\nYour feedback has been received and we appreciate the help 😊`;
	alert(message);
};

const showSubmitFailure = (form, error) => {
	let name = form["name"].value;
	let message = `Sorry${
		name === "" ? "!" : ` ${name}!`
	}... There seems to have been a problem sending your message\nIf the problem persists, please get onto us at ${SITE_EMAIL}.\n${
		error.message === undefined ? "" : error.message
	}`;
	alert(message);
};

const botFilterIsClear = () => {
    const honeypotPhoneIsEmpty = document.getElementById("hp-phone").value === '';
    return honeypotPhoneIsEmpty && checkMessageRate();
}

feedbackForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const serviceID = "default_service";
	const templateID = "template_zeyvosr";
	const feedbackForm = event.target;
    
	if(botFilterIsClear()){
        setSendButtonText("Sending...");
		emailjs.sendForm(serviceID, templateID, feedbackForm)
		    .then(() => {
		        setSendButtonText();
		        showSubmitConfirmation(feedbackForm);
		        feedbackForm.reset();
		        goHome();
		    }, (error) => {
		        setSendButtonText();
		        showSubmitFailure(feedbackForm, error);
		    });
	}
	
});

feedbackForm.addEventListener("reset", (event) => {
	goHome();
});

// =========== RATE LIMITING ===========

function checkMessageRate() {
    const messageRateLimit = 60; // Time limit in seconds between messages
    const lastMessageTime = parseFloat(getCookie('lastMessageTime'));
    const currentTime = new Date().getTime() / 1000; // Convert to seconds

    if (currentTime - lastMessageTime < messageRateLimit) {
        // Display an error message or take appropriate action
        alert('Please wait before sending another message.');
        return false;
    }

    // Set the current time as the last message time in the cookie
    setCookie('lastMessageTime', currentTime, 1); // Set cookie with 1 day expiry

    return true;
}

function getCookie(name) {
    const cookieValue = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return cookieValue ? cookieValue.pop() : '';
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}