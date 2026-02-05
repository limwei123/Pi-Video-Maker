let currentUser = null;

function setStatus(msg){
  document.getElementById("status").innerText = msg;
}

function setUser(u){
  document.getElementById("userLine").innerText = "👤 " + u.username;
}

async function initPi(){
  try{
    const isSandbox = window.location.hostname.includes("sandbox");
    Pi.init({ version:"2.0", sandbox:isSandbox });
    setStatus("Pi SDK ready");
  }catch(e){
    setStatus("Pi SDK failed to load");
    console.log(e);
  }
}

initPi();

document.getElementById("signinBtn").onclick = async () =>{
  try{
    setStatus("Signing in...");
    const scopes = ['username','payments'];
    currentUser = await Pi.authenticate(scopes);
    setUser(currentUser.user);
    setStatus("Signed in ✅");
    document.getElementById("payBtn").disabled=false;
  }catch(e){
    setStatus("Sign in failed");
    console.log(e);
  }
};

document.getElementById("payBtn").onclick = async ()=>{
  try{
    setStatus("Creating payment...");
    const payment = await Pi.createPayment({
      amount: 1,
      memo: "Unlock video generator",
      metadata:{}
    },{
      onReadyForServerApproval: function(paymentId){
        console.log("ready approve", paymentId);
      },
      onReadyForServerCompletion: function(paymentId){
        console.log("complete", paymentId);
        setStatus("Payment success ✅");
        window.location.href="/create-video";
      },
      onCancel: function(){
        setStatus("Payment cancelled");
      },
      onError: function(e){
        setStatus("Payment error");
        console.log(e);
      }
    });
  }catch(e){
    console.log(e);
    setStatus("Payment failed");
  }
};
