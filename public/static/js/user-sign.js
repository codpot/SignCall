$(function () {
  const user_id = 'sign';

  // WebSocket
  let ws;
  let ws_client;

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
          const converted = msg.replace(/ /g, '');
          if (converted.indexOf('괜찮아') > -1) {
            PlaySign('괜찮아');
          } else if (converted.indexOf('나도밤샜어') > -1) {
            PlaySign('나도밤샜어');
          } else if (converted.indexOf('나이제자려고') > -1) {
            PlaySign('나이제자려고');
          } else if (converted.indexOf('나잘게') > -1) {
            PlaySign('나잘게');
          } else if (converted.indexOf('보고싶어') > -1) {
            PlaySign('보고싶어');
          } else if (converted.indexOf('안녕') > -1) {
            PlaySign('안녕');
          } else if (converted.indexOf('어제밤샜어') > -1) {
            PlaySign('어제밤샜어');
          } else if (converted.indexOf('시험망했어') > -1) {
            PlaySign('시험망했어');
          } else if (converted.indexOf('위로고마워') > -1) {
            PlaySign('위로고마워');
          }
          ShowSub(msg);
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

  // WebSocket Connect
  function connect2() {
    ws_client = new WebSocket('ws://localhost:7777');

    // Leap Motion Client Open
    ws_client.onopen = (event) => {
      console.log('Client Connected.');
    };

    // Leap Motion Client Close
    ws_client.onclose = (event) => {
      console.log('Client Disconnected.');
      connect2();
    };

    // Leap Motion Client Message
    ws_client.onmessage = (event) => {
      const cmd = event.data.split('||')[0];
      const msg = event.data.split('||')[1];
      switch (cmd) {
        case 'STATUS':
          ws.send(`${user_id}||STATUS||${msg}`);
          break;
        case 'MSG':
          ws.send(`${user_id}||MSG||${msg}`);
          break;
      }
    };
  }
  connect2();

  // Video Play
  function PlaySign(file_name) {
    $('#chatVideo').get(0).pause();
    $('#chatVideo').attr('src', `/static/video/${file_name}.mp4`);
    $('#chatVideo').get(0).load();
    $('#chatVideo').show();
    $('#chatVideo').get(0).play();
    $('#chatVideo').on('ended',function() {
      $(this).hide();
    });
  }

  function ShowSub(msg) {
    $('#subscription').hide();
    $('#subscription').text(msg);
    $('#subscription').show();
    setTimeout(function() {
      $('#subscription').hide();
    }, 3000);
  }

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
