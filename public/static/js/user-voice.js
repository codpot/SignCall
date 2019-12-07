$(function () {
  const user_id = 'voice';

  // WebSocket
  let ws;

  // WebSocket Connect
  function connect() {
    ws = new WebSocket('wss://signcall.khunet.net');

    // WebSocket Open
    ws.onopen = (event) => {
      console.log('Server Connected.');
    };

    // WebSocket Close
    ws.onclose = (event) => {
      console.log('Server Disconnected.');
      connect();
    };

    // WebSocket Message
    ws.onmessage = (event) => {
      const to = event.data.split('||')[0];
      const cmd = event.data.split('||')[1];
      const msg = event.data.split('||')[2];
      if (to !== 'all' && to !== user_id) {
        return;
      }
      switch (cmd) {
        case 'CURRENT':
          startWebRTC();
          if (msg === '1') {
            console.log('상대방이 연결되지 않았습니다. 대기 바랍니다.');
          } else if (msg === '2') {
            console.log('상대방이 연결되었습니다.');
          } else {
            console.log('중복으로 접속되었습니다. 다른 창을 닫아주세요.');
          }
          break;
        case 'STATUS':
          console.log(`상대방 상태 - ${msg}`);
          break;
        case 'MSG':
          const speech = new SpeechSynthesisUtterance(msg);
          speech.lang = 'ko-KR';
          window.speechSynthesis.speak(speech);
          console.log(`메시지 도착 - ${msg}`);
          break;
        case 'RTC':
          const message = JSON.parse(atob(msg));
          ProcessWebRTC(message);
          break;
      }
    };
  }
  connect();

  // Speech Recognition
  const recognition = new webkitSpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();
  recognition.onspeechstart = () => {
    ws.send(`${user_id}||STATUS||talking`);
  };
  recognition.onspeechend = () => {
    ws.send(`${user_id}||STATUS||ready`);
  };
  recognition.onend = () => {
    recognition.start();
  };
  recognition.onresult = (event) => {
    const voice_data = event.results[0][0].transcript;
    ws.send(`${user_id}||MSG||${voice_data}`);
  };

  // WebRTC
  let pc;
  const WebRTC_config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  function startWebRTC() {
    pc = new RTCPeerConnection(WebRTC_config);
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        SendMsg({ 'candidate': event.candidate });
      }
    };
    pc.onnegotiationneeded = () => {
      pc.createOffer()
        .then((description) => {
          pc.setLocalDescription(description, () => {
            SendMsg({ 'sdp': pc.localDescription });
          }, (error) => {
            console.log(error);
          });
        })
        .catch((error) => {
          console.log(error);
        });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
        remoteVideo.srcObject = stream;
      }
    };
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then((stream) => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      })
      .catch((error) => {
        console.log(error);
      });
  }
  function ProcessWebRTC(message) {
    if (message.sdp) {
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer()
            .then((description) => {
              pc.setLocalDescription(description, () => {
                SendMsg({ 'sdp': pc.localDescription });
              }, (error) => {
                console.log(error);
              });
            })
            .catch((error) => {
              console.log(error);
            });
        }
      }, (error) => {
        console.log(error);
      });
    } else if (message.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(message.candidate), () => {}, (error) => {
        console.log(error);
      });
    }
  }
  function SendMsg(msg) {
    const data = btoa(JSON.stringify(msg));
    ws.send(`${user_id}||RTC||${data}`);
  }
});
