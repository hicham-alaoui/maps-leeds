// Global variables
var map;
var infoWindow;
var bounds;

// Google maps init function
function initMap() {

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 6,
        mapTypeControl: false
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();
   
    ko.applyBindings(new ViewModel());
}

// handle map error function
function mapErrorMessage() {
    alert('Ooops! Google Maps error.');
}

//Markers position variable
var markerPosition = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = '',
    this.city = '',
    this.phone = '';

    this.visible = ko.observable(true);

    // Marker styling.
    var defaultIcon = markerIcon('FFA500');

    //Foursquare API
    var clientID = 'AQUSRRNNSBYMHVKQROWVSCNCGWALVAEWNPGJIYLN5KLMMRGN';
    var clientSecret = 'IFTL1SVWV1JPOVLCWQX01OC0ABJGT1DCJSBDYYAY2Y21T0BD';

    // Foursquare JSON data
    var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20160118' + '&query=' + this.title;

    $.getJSON(reqURL).done(function(data) {
        var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: 'N/A';
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: 'N/A';
        self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : 'N/A';
    }).fail(function() {
        alert('Oops! Foursquare error.');
    });


    // Assign markers to locations
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon
    });    

    //Using computed binding for markers
    self.filterMarkers = ko.computed(function () {
        //Settting bounds
        if(self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });
    
    // Open Streetview on click event
    this.marker.addListener('click', function() {
        showItemInfo(this, self.street, self.city, self.phone, infoWindow);
        toggleBounce(this);
        map.panTo(this.getPosition());
    });

    // Display item when list ityem clicked
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };

};

//View Model
var ViewModel = function() {
    var self = this;

    this.fetchItem = ko.observable('');

    this.locationsList = ko.observableArray([]);

    // add location markers for each location
    locations.forEach(function(location) {
        self.locationsList.push( new markerPosition(location) );
    });

    // locations viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.fetchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.locationsList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
				return result;
			});
        }
        self.locationsList().forEach(function(location) {
            location.visible(true);
        });
        return self.locationsList();
    }, self);
};

//Pop-up information window.
function showItemInfo(marker, street, city, phone, infowindow) {
    // Check information window opened.
    if (infowindow.marker != marker) {
        // Clear information window.
        infowindow.setContent('');
        infowindow.marker = marker;

        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        var windowContent = '<h5>' + marker.title + '</h5>' + 
            '<p>' + street + "<br>" + city + '<br>' + phone + "</p>";

        // Compute the street view position.
        var streetView = function (data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                infowindow.setContent(windowContent + '<div id="pano_view"></div>');
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById('pano_view'), panoramaOptions);
            } else {
                infowindow.setContent(windowContent + '<div>Oops! Streetview error.</div>');
            }
        };
        // Getting the closest image using streetView variable
        streetViewService.getPanoramaByLocation(marker.position, radius, streetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}



// Create the marker icon .
function markerIcon() {
    var iconImage = new google.maps.MarkerImage(
        'img/marker.png',
        new google.maps.Size(26, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(17, 34),
        new google.maps.Size(26, 34));
    return iconImage;
}


//Adding Flickr
 var flickrJSON;

//Binds click handler to flickr image to open modal
$("#flickr-button").click(function() {
    $(".modal").css("z-index", "3");
    $(".modal").show();
});

//Binds click handler to x button to close modal
$("#close-modal").click(function() {
    $(".modal").css("z-index", "0");
    $(".modal").hide();
    $('.imageContainer img').hide();
    fetchImages = true;
});

//GET JSON from flickr.
//Display message if error getting flickr JSON.
function getFlickrImages() {
        var flickrUrl = 'https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=1ebd3c90aefcf59a8152f8f3738a2a88&accuracy=16&lat=53.811506&lon=-1.532465&format=json';
        $.ajax({
            url: flickrUrl,
            dataType: 'jsonp',
            jsonp: 'jsoncallback',
            success: function(data) {
                var photo = data.photos.photo;
                flickrJSON = photo;
            },
            error: function() {
                $('.imageContainer').append('<h2 style="text-align: center;">Oops! Flickr images loading error. Try again</h2>');
                $("#right-arrow").hide();
                $("#left-arrow").hide();

                }
        });
}
getFlickrImages();

var photosArray = [];
var counter = 0;
var fetchImages = false;

//Function to get 25 images and store them in array.
function setFlickrImages() {
    if(fetchImages === false) {
        for(var i=0; i < 25; i++) {
            var number = Math.floor((Math.random() * 250) + 1);
            var photo = 'https://farm' + flickrJSON[number].farm + '.staticflickr.com/' + flickrJSON[number].server + '/' + flickrJSON[number].id + '_' + flickrJSON[number].secret + '.jpg';
            photosArray.push(photo);
            $('.imageContainer').append('<img id="location-image' + i + '" src="' + photo + '" alt="' + flickrJSON[number].title + ' Flickr Image">');
            $("#location-image" + i).hide();    
            if(i < 1) {
                $("#location-image" + i).show();
            }
        }
    } else {
        $("#location-image" + counter).show();
    }
}
$("#flickr-button").click(setFlickrImages);

//Bind click handler to arrow button to view next image
function forwardArrow() {
    $('#location-image' + counter).hide();
    counter += 1;
    if(counter >= 24) {
        counter = 0;
    }
    $('#location-image' + counter).fadeIn(300); 
}

//Bind click handler to arrow button to view previous image.
function backwardArrow() {
    $('#location-image' + counter).hide();
    counter -= 1;
    if(counter < 0) {
        counter = 24;
    }
    $('#location-image' + counter).fadeIn(300); 
}

$("#right-arrow").click(forwardArrow);
$("#left-arrow").click(backwardArrow);             