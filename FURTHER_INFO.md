# Supplemental Information for Location Toolkit (LTK) 

## Object Model

LTK leverages the [Location](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_location.htm) and [Address](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_address.htm) objects enabled in Salesforce industry cloud products, linked to any other Salesforce object via a Location lookup/reference field in that object.  The Location lookup field can be a standard field or a custom field.

Below is an example of the data model for tracking location of ProductItem records, where the ProductItem is a child or a parent Product (Product2) record.
This data model is what then supports the Related Records Location lightning web component rendering ProductItem records on a map for a Product record page.

![LTK ERD](./docs/LTK_ERD.png)

## Flow Triggers for Parent Location and Child Address records

Because Salesforce uses 2 objects to contain the meaningful information about a Location and when applicable its associated Address, LTK uses the following Flow triggers to surface any relevant information from the child Address record up to fields in its parent Location record.  

### PushAddressFieldsJSONToItsParentLocation

This flow creates a JSON string fragment from the discrete Address.Street, Address.City, etc fields copied into Location.LTK_AddressJSON__c

_Location Field updated:_ `LTK_AddressJSON__c`\
_Sample values populated:_ `"Street": "8280 Greensboro Drive","City": "McLean","State": "VA","PostalCode": "22102","Country": "United States"`

### PushAddressLatLongToItsParentLocation

This flow copies Address.Latitude and Address.Longitude values into its parent’s Location.Latitude and Location.Longitude fields whenever those fields are updated in the child Address record.

_Location Fields updated_: `Latitude, Longitude`\
_Sample values populated_: `38.8881121, -77.0273323`

## Compliance Notes: location/address data flows to/from Google APIs

Specific to this Location Toolkit package, the following data flows are documented below because they exchange with Google APIs some user-specified locations & addresses, or Salesforce object records containing location and/or address information.

These API data flows only traverse only between the end-user’s web browser and the specified Google API service endpoint. These flows _do not_ originate from Salesforce servers and thus are not subject to compliance boundaries related to FedRAMP or similar cloud security standards. 

### Address Autocompletion example

#### Part 1: User enters text in Address Field to be autocompleted: “1600 Pennsylvania Avenue NW Washington”

When an end-user creates a new Location using Address Autocompletion to create or update that Location’s Address, their browser makes the following API call to Google to offer the user matching fully-formed address(es)

Request (http GET)
```
https://maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson?1s1600%20Pennsylvania%20Avenue%20NW%20Washington&4sen-US&6m6&1m2&1d37.790091&2d-122.396848&2m2&1d37.790091&2d-122.396848&9sgeocode&15e3&21m1&2e1&r_url=https%3A%2F%2Fmaps.a.forceusercontent.com%2Flightningmaps%2Fmapsloader&callback=_xdc_._ya9230&key=AIzaSyAnsUgPM5XmaLKYqFVfdP1TmuiOzBhtSdA&token=59073
```

Response
```json
/**/_xdc_._ya9230 && _xdc_._ya9230( {
"predictions" :
[
{
"description" : "1600 Pennsylvania Avenue Northwest, Washington, DC, USA",
"matched_substrings" :
[
{
"length" : 4,
"offset" : 0
},
{
"length" : 29,
"offset" : 5
},
{
"length" : 10,
"offset" : 36
}
],
"place_id" : "ChIJj29ffVS3t4kRssvmz4DOiZE",
"reference" : "ChIJj29ffVS3t4kRssvmz4DOiZE",
"structured_formatting" :
{
"main_text" : "1600 Pennsylvania Avenue Northwest",
"main_text_matched_substrings" :
[
{
"length" : 4,
"offset" : 0
},
{
"length" : 29,
"offset" : 5
}
],
"secondary_text" : "Washington, DC, USA",
"secondary_text_matched_substrings" :
[
{
"length" : 10,
"offset" : 0
}
]
},
"terms" :
[
{
"offset" : 0,
"value" : "1600"
},
{
"offset" : 5,
"value" : "Pennsylvania Avenue Northwest"
},
{
"offset" : 36,
"value" : "Washington"
},
{
"offset" : 48,
"value" : "DC"
},
{
"offset" : 52,
"value" : "USA"
}
],
"types" :
[
"street_address",
"geocode"
]
}
],
"status" : "OK"
} )
```

#### Part 2: User selects a predicted matching address, filling in all Street, City, etc. fields (example)

Once the user selects a specific matching address, parts of the `address_components` Response data associated with the selected address ([Google Place Details](https://developers.google.com/maps/documentation/places/web-service/details)) are entered automatically back into the Geocoded Location utility as a convenience to the end user.  

Request (http GET)
```
https://maps.googleapis.com/maps/api/place/js/PlaceService.GetPlaceDetails?2sen-US&10e3&14m1&1sChIJj29ffVS3t4kRssvmz4DOiZE&17m1&2e1&r_url=https%3A%2F%2Fmaps.a.forceusercontent.com%2Flightningmaps%2Fmapsloader&callback=_xdc_._yzyth7&key=AIzaSyAnsUgPM5XmaLKYqFVfdP1TmuiOzBhtSdA&token=83326`
```

Response
```json
/**/_xdc_._yzyth7 && _xdc_._yzyth7( {
"html_attributions" : [],
"result" :
{
"address_components" :
[
{
"long_name" : "1600",
"short_name" : "1600",
"types" :
[
"street_number"
]
},
{
"long_name" : "Pennsylvania Avenue Northwest",
"short_name" : "Pennsylvania Avenue NW",
"types" :
[
"route"
]
},
{
"long_name" : "Northwest Washington",
"short_name" : "Northwest Washington",
"types" :
[
"neighborhood",
"political"
]
},
{
"long_name" : "Washington",
"short_name" : "Washington",
"types" :
[
"locality",
"political"
]
},
{
"long_name" : "District of Columbia",
"short_name" : "DC",
"types" :
[
"administrative_area_level_1",
"political"
]
},
{
"long_name" : "United States",
"short_name" : "US",
"types" :
[
"country",
"political"
]
},
{
"long_name" : "20500",
"short_name" : "20500",
"types" :
[
"postal_code"
]
},
{
"long_name" : "0005",
"short_name" : "0005",
"types" :
[
"postal_code_suffix"
]
}
],
"adr_address" : "\u003cspan class=\"street-address\"\u003e1600 Pennsylvania Avenue NW\u003c/span\u003e, \u003cspan class=\"locality\"\u003eWashington\u003c/span\u003e, \u003cspan class=\"region\"\u003eDC\u003c/span\u003e \u003cspan class=\"postal-code\"\u003e20500-0005\u003c/span\u003e, \u003cspan class=\"country-name\"\u003eUSA\u003c/span\u003e",
"formatted_address" : "1600 Pennsylvania Avenue NW, Washington, DC 20500, USA",
"geometry" :
{
"location" :
{
"lat" : 38.8975562,
"lng" : -77.03645399999999
},
"viewport" :
{
"northeast" :
{
"lat" : 38.8995232302915,
"lng" : -77.03495109999997
},
"southwest" :
{
"lat" : 38.8968252697085,
"lng" : -77.04096270000004
}
}
},
"icon" : "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/geocode-71.png",
"icon_background_color" : "#7B9EB0",
"icon_mask_base_uri" : "https://maps.gstatic.com/mapfiles/place_api/icons/v2/generic_pinlet",
"name" : "1600 Pennsylvania Avenue NW",
"place_id" : "ChIJj29ffVS3t4kRssvmz4DOiZE",
"plus_code" :
{
"compound_code" : "VXX7+3C Washington, DC, USA",
"global_code" : "87C4VXX7+3C"
},
"reference" : "ChIJj29ffVS3t4kRssvmz4DOiZE",
"types" :
[
"street_address"
],
"url" : "https://maps.google.com/?q=1600+Pennsylvania+Avenue+NW,+Washington,+DC+20500,+USA&ftid=0x89b7b7547d5f6f8f:0x9189ce80cfe6cbb2",
"utc_offset" : -240,
"vicinity" : "Washington"
},
"status" : "OK"
} )
```

### Google Maps API for Rendering Maps example

The LTK Related Records Locations lightning web component implements a [Map](https://developer.salesforce.com/docs/component-library/bundle/lightning-map/documentation) Lightning Web Component, with Marker locations rendered using google’s [Markers](https://developers.google.com/maps/documentation/javascript/markers) javascript API.  

For Location records that only have Address information but no Latitude or Longitude coordinates (i.e. not geocoded in advance) Google’s [Geocoder](https://developers.google.com/maps/documentation/javascript/reference/geocoder#GeocoderRequest) API is called to Geocode each Marker’s location at runtime as the map is rendered by the user’s web browser via the LTK Related Records Locations lightning web component. 

This LTK package does not itself include any Geocoding functions or logic. However any customer org could configure Geocoding separately on Location or Address objects using the [Salesforce Maps product](https://www.salesforce.com/sales/mapping-software/), or by implementing an Apex callout like [this](https://help.salesforce.com/s/articleView?id=sf.fields_caf_geocode.htm&type=5) or an [http callout from flow](https://help.salesforce.com/s/articleView?id=sf.flow_http_callout.htm&type=5) out to Geocoding services from Google, ESRI, [AWS](https://aws.amazon.com/pm/location), et. al.

Note also that for a parent record page with multiple child records requiring Geocoding, this API will be called multiple times i.e. once for each of those child records.  At high volumes Google may throttle the Geocoder API below and impact rendering of the map for the end user, so consider Geocoding Location records in advance separately as described above.

Here is an example Geocoding API request/response getting Latitude and Longitude for the address 8280 Greensboro Dr, McLean, VA 22102, USA

Request (http GET)
```
https://maps.googleapis.com/maps/api/js/GeocodeService.Search?4s8280%20Greensboro%20Drive%20McLean%2022102%20VA%20United%20States&7sUS&9sen-US&r_url=https%3A%2F%2Fmaps.a.forceusercontent.com%2Flightningmaps%2Fmapsloader&callback=_xdc_._ih68q2&key=AIzaSyAnsUgPM5XmaLKYqFVfdP1TmuiOzBhtSdA&token=57526
```

Response
```json
/**/_xdc_._ih68q2 && _xdc_._ih68q2( {
"results" :
[
{
"address_components" :
[
{
"long_name" : "8280",
"short_name" : "8280",
"types" :
[
"street_number"
]
},
{
"long_name" : "Greensboro Drive",
"short_name" : "Greensboro Dr",
"types" :
[
"route"
]
},
{
"long_name" : "McLean",
"short_name" : "McLean",
"types" :
[
"locality",
"political"
]
},
{
"long_name" : "Fairfax County",
"short_name" : "Fairfax County",
"types" :
[
"administrative_area_level_2",
"political"
]
},
{
"long_name" : "Virginia",
"short_name" : "VA",
"types" :
[
"administrative_area_level_1",
"political"
]
},
{
"long_name" : "United States",
"short_name" : "US",
"types" :
[
"country",
"political"
]
},
{
"long_name" : "22102",
"short_name" : "22102",
"types" :
[
"postal_code"
]
},
{
"long_name" : "4905",
"short_name" : "4905",
"types" :
[
"postal_code_suffix"
]
}
],
"formatted_address" : "8280 Greensboro Dr, McLean, VA 22102, USA",
"geometry" :
{
"location" :
{
"lat" : 38.9248248,
"lng" : -77.2311591
},
"location_type" : "ROOFTOP",
"viewport" :
{
"northeast" :
{
"lat" : 38.92604308029149,
"lng" : -77.2300286697085
},
"southwest" :
{
"lat" : 38.92334511970849,
"lng" : -77.23272663029151
}
}
},
"place_id" : "ChIJB5Uc7nBLtokRrWWcfzHxVsE",
"plus_code" :
{
"compound_code" : "WQF9+WG McLean, VA",
"global_code" : "87C4WQF9+WG"
},
"types" :
[
"street_address"
]
}
],
"status" : "OK"
} )
```

## Release Notes

### v1.942 (Initial public release) - Spring 25

First release!  Release number is >1 due to quirks in Salesforce packaging process.

Features under consideration for future releases include
* enhancing Related Records Locations lwc for use in Flow Screens rendering records of a config'd object having a Location field
* creating another lwc based on LeafletJS for UI/other features not available in the base `lightning-map` lwc



