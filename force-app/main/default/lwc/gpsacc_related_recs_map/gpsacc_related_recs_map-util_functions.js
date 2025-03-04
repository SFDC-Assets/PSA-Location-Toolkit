import { ICONS } from './gpsacc_related_recs_map-resources';

function findByRelName(array, name) {
    return array.find(item => item.relationshipName === name);
}

function findColorFieldPropertyById(array, theColorFieldProp, idValue) {
    return array.find(item => item.Id===idValue)[theColorFieldProp].value;
}

function grepNonNullRecords(array, field) {
    return array.filter(item => item[field] !== null);
  }

function includesByRelName(array, name) {
    return array.filter(item => item.relationshipName.includes(name));
}

function findLocationReferenceField(obj, searchString) {
    let result = [];
  
    function recursiveLocationRefSearch(currentObj) {
      for (let key in currentObj) {
        if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
          // if ( key.startsWith(searchString) && currentObj[key].dataType==="Reference" && currentObj[key].referenceToInfos[0].apiName==='Location' ) {
          if ( key.includes(searchString) && currentObj[key].dataType==="Reference" && currentObj[key].referenceToInfos[0].apiName==='Location' ) {
              result.push({ key: key, value: currentObj[key] });
          }
  
          if (currentObj[key] !== null && typeof currentObj[key] === 'object') {
            recursiveLocationRefSearch(currentObj[key]);
          }
        }
      }
    }
  
    recursiveLocationRefSearch(obj);
    return result;
  }

function findField(obj, searchString) {
    let result = [];
  
    function recursiveSearch(currentObj) {
      for (let key in currentObj) {
        if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
          if (key.match(searchString)) {
            result.push({ key: key, value: currentObj[key] });
          }
  
          if (currentObj[key] !== null && typeof currentObj[key] === 'object') {
            recursiveSearch(currentObj[key]);
          }
        }
      }
    }
  
    recursiveSearch(obj);
    return result;
  }

function getNestedValue(obj, outerKey, innerKey) {
    // Check if the outer key exists
    var returnVal = null;
    if (Object.prototype.hasOwnProperty.call(obj, outerKey)) {
        if (Object.prototype.hasOwnProperty.call(obj[outerKey], innerKey)) {
            // get the value to the nested property
            returnVal = obj[outerKey][innerKey];
        } else {
            console.error("Inner key not found");
            returnVal = null;
        }
    } else {
        console.log("Outer key not found, returning null which can be legit.");
        returnVal = null;
    }
    return returnVal;
}

function parseAddressFieldValue(jsonstr,field) {
    let result;
    if ( (jsonstr === null) || (jsonstr === '') ) {
            result = null;
        } 
        else
        {   
            let jsobj = JSON.parse('{'+jsonstr+'}');
            result = jsobj[field];
        }
    return result;
}

function iconName(ObjAPIname) {
    var theIconName = ICONS[ObjAPIname];
    var returnIcon = null;

    if (theIconName == null) {
        theIconName = ICONS.Address;
    }
    if (theIconName == null) {
        returnIcon = 'standard:location';
    } else {
        returnIcon = theIconName;
    }
    return returnIcon;
}

function sumOfMapValues(theMap) {
    let sum = 0;
    theMap.forEach(value => {
        sum = sum + value;
    });
    return sum;
}

function gql_template($) {
    return `query childRecsLocationsForParent($recordId: ID) {
    uiapi {
        query {
            ${$.childobj_param} (where: { 
            and: [
                {
                    ${$.lookup_param}: { eq: $recordId } 
                },
                { 
                        ${$.LocationLU_param}: { ne: null } 
                }
                ]
            }, first: 2000) @category(name: "recordQuery") {
                edges {
                    node {
                        Id
                        ${$.f1_param} 
                        ${$.f2_param} 
                        ${$.f3_param} 
                        ${$.LocationRLU_param} @category(name: "parentRelationship") {
                            Name @category(name: "StringValue") { value }
                            Latitude @category(name: "LatitudeValue") { value }
                            Longitude @category(name: "LongitudeValue") { value }
                            LTK_AddressJSON__c @category(name: "StringValue") { value }
                        }
                    }
                }
            }
        }
    }
}  
`;
}

export { gql_template, sumOfMapValues, iconName, getNestedValue, parseAddressFieldValue, includesByRelName, findField, findLocationReferenceField, findColorFieldPropertyById, grepNonNullRecords, findByRelName };