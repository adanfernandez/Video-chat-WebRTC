document.addEventListener("DOMContentLoaded", function(event) {

    var constraints = { audio: true, video: true }; //interested in video & audio

    var remoteVideo = document.getElementById("remoteVideo");

    //JavaScript variables associated with call management buttons in the page
    var startButton = document.getElementById("startButton");
    var callButton = document.getElementById("callButton");
    var hangupButton = document.getElementById("hangupButton");
    var video = document.getElementById("myVideo");
    var localPeerConnection, remotePeerConnection;
    var remoteUsername = "";
    var theStream;


    var websocket = new WebSocket('ws:localhost:9002');
    websocket.onopen = function() {
        console.log("Connected");
    };
    websocket.onmessage = function(message) {
        console.log("Got message", message.data);
        var data = JSON.parse(message.data);
        switch (data.type) {
            case "login":
                onLogin(data.success);
                break;
            case "offer":
                onOffer(data.offer, data.source);
                break;
            case "answer":
                onAnswer(data.answer);
                break;
            case "candidate":
                onCandidate(data.candidate);
                break;
            case "leave":
                hangup();
                break;
            default:
                break;
        }
    }


    //Just allow the user to click on the 'Start' button at start-up
    startButton.disabled = false;
    callButton.disabled = true;
    hangupButton.disabled = true;

    //Associate JavaScript handlers with click events on the buttons
    startButton.onclick = start;
    callButton.onclick = call;
    hangupButton.onclick = hangup;



    //*********************************************************
    //Function associated with clicking on the 'Start' button
    //This is the event triggering all other actions
    function start() {
        console.log("Requesting stream");
        //First of all, disable the 'Start' button on the page
        startButton.disabled = true;
        navigator.mediaDevices.getUserMedia(constraints)
            .then(successCallback)
            .catch(errorCallback);
        var name = prompt("Please enter your name", "Name");
        send({
            type: "login",
            source: name
        });
    }

    //*********************************************************
    //Function associated with clicking on the 'Call' button
    //This is enabled upon successful completion of the 'Start' button handler
    function call() {
        console.log("Starting call");

        //First of all, disable the 'Call' button on the page
        callButton.disabled = true;

        remoteUsername = document.getElementById("remoteUsername").value;
        startingCallCommunication();

        //...and enable the 'Hangup' button
        hangupButton.disabled = false;
        if (typeof RTCPeerConnection == "undefined")
            RTCPeerConnection = webkitRTCPeerConnection;
        console.log("RTCPeerConnection object: " + RTCPeerConnection);

        //This is an optional configuration string, associated with NAT traversal setup
        var configuration = null;
        localPeerConnection = new RTCPeerConnection(configuration);
        remotePeerConnection = new RTCPeerConnection(configuration);
        console.log("Created local and remote peer connection objects");

        //Add the local stream (as returned by getUserMedia() to the local PeerConnection
        localPeerConnection.addStream(theStream);
        console.log("Added localStream to localPeerConnection");

        //Add a handler associated with ICE protocol events
        localPeerConnection.onicecandidate = gotLocalIceCandidate;
        remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
        //...and a second handler to be activated as soon as the remote stream becomes available
        remotePeerConnection.onaddstream = gotRemoteStream;
        localPeerConnection.createOffer(gotLocalDescription, onSignalingError);


    }

    //*********************************************************
    //Handler to be called when hanging up the call
    function hangup() {
        console.log("Ending call");
        //First of all, disable the 'Hangup' button on the page
        hangupButton.disabled = true;
        //...and enable the 'Call' button to allow for new calls to be established
        callButton.disabled = false;
        //Close PeerConnection(s)
        localPeerConnection.close();
        remotePeerConnection.close();
        //Reset local variables
        localPeerConnection = null;
        remotePeerConnection = null;

    }

    function onSignalingError(error) {
        console.log('Failed to create signaling message : ' + error.name);
    }

    function gotLocalDescription(description) {
        send({
            type: "offer",
            offer: description
        });
        localPeerConnection.setLocalDescription(description);
        remotePeerConnection.setRemoteDescription(description);
        //Create the Answer to the received Offer based on the 'local' description
        remotePeerConnection.createAnswer(gotRemoteDescription, onSignalingError);
    }

    /*function gotRemoteDescription(description) {
        remotePeerConnection.setLocalDescription(description);
        localPeerConnection.setRemoteDescription(description);
    }*/

    function gotLocalIceCandidate(event) {
        if (event.candidate) {
            remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        }
    }

    function gotRemoteIceCandidate(event) {
        if (event.candidate) {
            localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        }
    }

    //Handler to be called as soon as the remote stream becomes available
    function gotRemoteStream(event) {
        // Associate the remote video element with the retrieved stream
        remoteVideo.srcObject = event.stream;
        remoteVideo.play();
    }

    function successCallback(stream) {
        theStream = stream;
        video.srcObject = stream;
        video.play();
        callButton.disabled = false;
    }

    function errorCallback(error) {
        console.log("navigator.getUserMedia error: ", error);
    }

    function onLogin(success) {
        if (success === false) {
            alert("Login unsuccessful, please try a different name.");
        } else {
            //First of all, disable the 'Start' button on the page
            startButton.disabled = true;
            navigator.getUserMedia(constraints, successCallback, errorCallback);
        }
    }

    function onOffer(offer, source) {
        startingCallCommunication();
        remoteUsername = source;
        localPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        localPeerConnection.createAnswer(function(answer) {
            localPeerConnection.setLocalDescription(answer);
            send({
                type: "answer",
                answer: answer
            });
        }, function(error) {
            alert("An error has occurred");
        });
    }

    function onAnswer(answer) {
        localPeerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    };

    function onCandidate(candidate) {
        localPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    function startingCallCommunication() {
        hangupButton.disabled = false;
        if (typeof RTCPeerConnection == "undefined")
            RTCPeerConnection = webkitRTCPeerConnection;
        console.log("RTCPeerConnection: " + RTCPeerConnection);
        var configuration = {
            "iceServers": [{ "url": "stun:stun01.sipphone.com" }]
        }
        localPeerConnection = new RTCPeerConnection(configuration);
        console.log("Created local peer connection object");
        localPeerConnection.addStream(theStream);
        console.log("Added localStream to localPeerConnection");
        localPeerConnection.onicecandidate = gotLocalIceCandidate;
        localPeerConnection.onaddstream = gotRemoteStream;
    }

    function send(message) {
        if (remoteUsername.length > 0) {
            message.target = remoteUsername;
        }
        websocket.send(JSON.stringify(message));
    }

    function getMedia(constraints) {
        if (theStream) {
            video.srcObject = null; //it does not release the hardware
            theStream.getTracks().forEach(function(track) { //releases the hardware
                track.stop();
            });
        }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(successCallback)
            .catch(errorCallback);
    }




});