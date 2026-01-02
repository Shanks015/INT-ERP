/**
 * Google Apps Script to Sync Form Responses to Backend Webhook
 * 
 * Instructions:
 * 1. Open your Google Form.
 * 2. Click the 3 dots (More) -> Script Editor.
 * 3. Delete any existing code and paste this script.
 * 4. Save the project.
 * 5. Run the 'setupTrigger' function once (Select it from top dropdown and click Run).
 * 6. Grant necessary permissions when prompted.
 */

// CONFIGURATION
// Replace with your actual live backend URL
const BACKEND_URL = 'https://int-erp.onrender.com/api/google-forms/webhook';
// const BACKEND_URL = 'http://YOUR_PUBLIC_IP:5000/api/google-forms/webhook'; // For local testing

function onFormSubmit(e) {
    var response = e.response;
    var form = FormApp.getActiveForm();
    var formTitle = form.getTitle();

    var itemResponses = response.getItemResponses();
    var responsesPayload = [];

    for (var i = 0; i < itemResponses.length; i++) {
        var itemResponse = itemResponses[i];
        responsesPayload.push({
            question: itemResponse.getItem().getTitle(),
            answer: itemResponse.getResponse()
        });
    }

    var payload = {
        formTitle: formTitle,
        timestamp: new Date().toISOString(),
        responses: responsesPayload
    };

    var options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload),
        // 'muteHttpExceptions': true
    };

    try {
        UrlFetchApp.fetch(BACKEND_URL, options);
        Logger.log('Successfully sent data to backend');
    } catch (error) {
        Logger.log('Error sending data: ' + error.toString());
    }
}

function setupTrigger() {
    var form = FormApp.getActiveForm();

    // Remove existing triggers to avoid duplicates
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        ScriptApp.deleteTrigger(triggers[i]);
    }

    // Create new trigger
    ScriptApp.newTrigger('onFormSubmit')
        .forForm(form)
        .onFormSubmit()
        .create();

    Logger.log('Trigger set up successfully');
}
