const defined = o => typeof o !== "undefined";

let map;
let infoWindow;
let cabinets = [];
let circles = [];

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 41.9028, lng: 12.4964 },
    zoom: 6
  });

  map.data.setStyle(feature => {
    return {
      visible: false
    };
  });
  
  infoWindow = new google.maps.InfoWindow();
  loadCabinetData();
}

let lastSelectedCircle;
function addCircle(c) {
  let pos = new google.maps.LatLng(c.LATITUDINE, c.LONGITUDINE);
  let circle = new google.maps.Circle({
    map,
    center: pos,
    radius: 100,
    fillColor: c.STATO == "DISPONIBILE" ? 'green' : 'yellow',
    fillOpacity: .3,
    strokeColor: 'white',
    strokeWeight: 1.5
  });

  let clickListener = new google.maps.event.addListener(circle, 'click', () => {
    if (lastSelectedCircle) {
      lastSelectedCircle.setOptions({
        strokeColor: 'white',
      });
    }
    circle.setOptions({
      strokeColor: 'black',
    });

    infoWindow.setContent([
      `<h2>${c.INDIRIZZO}</h2>`,
      `Data pianificazione: ${parseDate(c.DATA_PUBBLICAZIONE).toLocaleDateString()}`,
      c.STATO == "DISPONIBILE" ? `Data disponibilità: ${parseDate(c.DATA_DISPONIBILITA).toLocaleDateString()}` : '',
      `<a target="_blank" rel="noopener noreferrer"
        href="https://www.google.com/maps/search/?api=1&query=${pos.lat()},${pos.lng()}">View on Google Maps</a>`,
    ].reduce((out, el, i, arr) => out + '<div class="info-box">' + el + '</div>'));
    infoWindow.setPosition(pos);
    infoWindow.open(map);
    lastSelectedCircle = circle;
  });

  circles.push(circle);
  return circle;
}

function loadCabinetData() {
  fetch("https://api.allorigins.win/raw?url=https://www.fibercop.it/wp-content/uploads/2021/06/elenco_cro_cno.zip")
    .then(response => {
      if (response.status === 200 || response.status === 0) {
        return response.blob();
      } else {
        return Promise.reject(new Error(response.statusText));
      }
    })
    .then(JSZip.loadAsync)
    .then(zip => {
      for (f of Object.keys(zip.files)) {
        if (f.startsWith("elenco_cro_cno")) {
          return zip.file(f).async("string");
        }
      }
      return Promise.reject(new Error("Couldn't find cro_cno file"))
    })
    .then(s => {
      cabinets = csvToArray(s, ";");
      comuni = [...new Set(cabinets.map(c=>c.COMUNE))];
      datalist = document.getElementById("lista_comuni");
      datalist.innerHTML = '';
      for (c of comuni) {
        option = document.createElement('option');
        option.value = c;
        datalist.append(option);
      }
    })
}

function pickLocation() {
  clearData();
  let comune = document.getElementById("comune").value;
  let bounds = new google.maps.LatLngBounds();
  cabinets.filter(c => c.COMUNE == comune).forEach(c => {
    circle = addCircle(c);
    bounds.extend(circle.getBounds().getNorthEast());
    bounds.extend(circle.getBounds().getSouthWest());
  })
  map.fitBounds(bounds);
  // map.setZoom(map.getZoom() - 1);
}

function clearData() {
  for (circle of circles) {
    google.maps.event.clearListeners(circle, 'click');
    circle.setMap(null);
  }
}

// https://sebhastian.com/javascript-csv-to-array/
function csvToArray(str, delimiter = ",") {
  // slice from start of text to the first \n index
  // use split to create an array from string by delimiter
  const headers = str.slice(0, str.indexOf("\n")).split(delimiter);

  // slice from \n index + 1 to the end of the text
  // use split to create an array of each csv value row
  const rows = str.slice(str.indexOf("\n") + 1).split("\n").filter(l => l);

  // Map the rows
  // split values from each row into an array
  // use headers.reduce to create an object
  // object properties derived from headers:values
  // the object passed as an element of the array
  const arr = rows.map(row => {
    const values = row.split(delimiter);
    const el = headers.reduce((object, header, index) => {
      object[header] = values[index];
      return object;
    }, {});
    return el;
  });

  // return the array
  return arr;
}

function parseDate(s) {
  let y = s.substring(0, 4);
  let m = s.substring(4, 6);
  let d = s.substring(6, 8);

  return new Date(y, m-1, d);
}
