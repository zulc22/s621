var mascot = function(mascotimage, artist, href) {
    mascots[mascot_number] = {
        image: "/static/mascot/"+mascotimage,
        artist: artist, href: href,
        id: mascot_number
    };
    mascot_number++;
    return mascot_number-1
}

mascot_number = 0;
mascots = {};

mascot("og-esix.jpg", "Keishinkae", "https://furaffinity.net/user/keishinkae")
mascot_default = mascot("esix.jpg", "Keishinkae", "https://furaffinity.net/user/keishinkae")
mascot("chizi.jpg", "chizi", "https://furaffinity.net/user/chizi")
mascot("wiredhooves.jpg", "wiredhooves", "https://furaffinity.net/user/wiredhooves")
mascot("ecmajor.jpg", "ECMajor", "http://www.horsecore.org/")
mascot("evalion.jpg", "evalion", "https://furaffinity.net/user/evalion")
mascot("ratte_peacock.png", "Ratte", "https://furaffinity.net/user/ratte")
mascot("ratte_esix.png", "Ratte", "https://furaffinity.net/user/ratte")
mascot("chizi_crossing.png", "chizi", "https://furaffinity.net/user/chizi")
mascot("chizi_seductive.png", "chizi", "https://furaffinity.net/user/chizi")
mascot("ratte_grater.png", "Ratte", "https://furaffinity.net/user/ratte")
mascot("keishinkae_esix_ng.png", "Keishinkae", "https://furaffinity.net/user/keishinkae")

currentlySelectedMascot = undefined
function mascot_updateUI(k) {
    var m = mascots[k]
    if (m===undefined) {
        // mascot_saveCookie(mascot_default)
        mascot_updateUI(mascot_default)
        return
    }
    currentlySelectedMascot = k
    document.getElementById("esix").style.backgroundImage = "url("+m.image+")"
    document.getElementById("mascot_artist").href = m.href
    document.getElementById("mascot_artist").innerText = m.artist
}

function changeBG() {
    var m = currentlySelectedMascot+1;
    if (m >= mascot_number) m=0;
    mascot_updateUI(m)
    mascot_saveCookie(m)
}

function mascot_saveCookie(k) {
    $.post("/cookie/mascot", {mascot: k})
}

function mascot_init() {
    $.get("/cookie/mascot", function(data) {
        var saved_mascot;
        try {saved_mascot = parseInt(data)} catch (_) {
            mascot_saveCookie(mascot_default)
            mascot_updateUI(mascot_default)
            return
        }
        mascot_updateUI(saved_mascot)
    }).fail(function() {
        alert("Failed to fetch your mascot setting.")
        mascot_updateUI(mascot_default)
    })
}