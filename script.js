document.addEventListener("DOMContentLoaded", function(event) {

    var constraints = { audio: true, video: true }; //interested in video & audio

    var remoteVideo = document.getElementById("remoteVideo");

    //JavaScript variables associated with call management buttons in the page
    var startButton = document.getElementById("startButton");
    var callButton = document.getElementById("callButton");
    var hangupButton = document.getElementById("hangupButton");
    var video = document.getElementById("myVideo");

    var localPeerConnection, remotePeerConnection;


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
    }

    //*********************************************************
    //Function associated with clicking on the 'Call' button
    //This is enabled upon successful completion of the 'Start' button handler
    function call() {
        console.log("Starting call");

        //First of all, disable the 'Call' button on the page
        callButton.disabled = true;

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
        localPeerConnection.setLocalDescription(description);
        remotePeerConnection.setRemoteDescription(description);
        //Create the Answer to the received Offer based on the 'local' description
        remotePeerConnection.createAnswer(gotRemoteDescription, onSignalingError);
    }

    function gotRemoteDescription(description) {
        remotePeerConnection.setLocalDescription(description);
        localPeerConnection.setRemoteDescription(description);
    }

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
        remoteVideo.src = window.URL.createObjectURL(event.stream);
        remoteVideo.play();
    }

    function successCallback(stream) {
        video.srcObject = stream;
        video.play();
    }

    function errorCallback(error) {
        console.log("navigator.getUserMedia error: ", error);
    }
});