/* HosF&B — staff sign-in to the database for guest bookings.
   Bookings hold guests' names, phone numbers and allergies, so the database only lets signed-in
   staff read them. The staff screens sign in quietly with this one service login.
   SET-UP (once): Firebase Console → Authentication → Users → Add user with exactly this email and
   password, and publish the rules that name it (see the rules document). */
window.HOSFB_SERVICE={email:'hosfb.service@brandonhall.portal',pw:'Clarendon-Fb-7Kq2Xw9'};
window.hosfbStaffAuth=(function(){ let p=null;
  return function(){ if(p) return p;
    p=(async()=>{ try{ if(typeof firebase==='undefined'||!firebase.auth) return false; const a=firebase.auth();
        if(a.currentUser&&a.currentUser.email===HOSFB_SERVICE.email) return true;
        await a.signInWithEmailAndPassword(HOSFB_SERVICE.email,HOSFB_SERVICE.pw); return true;
      }catch(e){ console.warn('HosF&B staff sign-in',e&&e.code); p=null; return false; } })();
    return p; }; })();
