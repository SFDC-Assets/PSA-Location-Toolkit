import { LightningElement, api, track, wire } from 'lwc';
import { gql, graphql, refreshGraphQL } from "lightning/uiGraphQLApi";
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { NavigationMixin,CurrentPageReference } from "lightning/navigation";
import { RefreshEvent,registerRefreshHandler,unregisterRefreshHandler } from 'lightning/refresh';
import { mapMarkerSvgPath, keyMarkerSvgPath } from './gpsacc_related_recs_map-resources';
import { gql_template, iconName, sumOfMapValues, getNestedValue, parseAddressFieldValue, findByRelName, findField, findLocationReferenceField, findColorFieldPropertyById, grepNonNullRecords, includesByRelName } from './gpsacc_related_recs_map-util_functions';

var globalQueryString;

export default class Gpsacc_related_recs_map extends NavigationMixin(LightningElement) {
    @api childRelNameProperty;
    @api nameTitleFieldProperty;
    @api descriptionFieldProperty;
    @api recordId;
    @api objectApiName;
    @api colorFieldProperty = null;
    @api plValue1Property = null;
    @api color1Prop;
    @api plValue2Property = null;
    @api color2Prop;
    @api plValue3property = null;
    @api color3Prop;
    @api plValue4Property = null;
    @api color4Prop;
    @api plValue5Property = null;
    @api color5Prop;
    @api defaultColorProp = null;    
    @track linkURL;
    @track iconName;
    @track name;
    @track mapMarkers = [];
    @track selectedMarkerValue;
    @track selectedMarkerTitle;
    @track childObjPlural;
    @track colorFieldPropertyValue;
    @track DescriptionField_propValue;
    @track noMarkersToShow = true;
    @track showMap = false;
    @track markerSVGpath = keyMarkerSvgPath;
    @track theChildObjAPIName;
    @track colorFieldLabel;
    @track byColorFieldLabel;
    @track descriptionFieldLabel;
    showFooter = false;
    childRelQhold=true;
    childObjQhold=true; 
    queryResultCount=0;
    theChildRel = null;
    isLoading = true;
    graphqlResult;
    
    picklistColorsMap = new Map();
    colorFieldPropValuesCountMap = new Map();
    @track markersColorsKey = [];
    
    results;
    errors;
    graphqlData;

    locationLU;
    locationRLU;

    @wire(CurrentPageReference) PageRef;


    navigateToRecordViewPage() {
        // View object record page
        this[NavigationMixin.Navigate]({
        type: "standard__recordPage",
        attributes: {
            recordId: this.recordId,
            // objectApiName: "namespace__ObjectName", // objectApiName is optional
            actionName: "view",
            },
        });
    }

    combineMapsIntoMarkerColorsJSON(map1, map2) {
        const resultArray = [];
        map1.forEach((value, key) => {
          if (map2.has(key)) {
            resultArray.push({
              Id: key,
              count: value,
              color: this.getFillColor( map2.get(key) )
            });
          } else {
            if (key.includes('default')) {
                resultArray.push({
                    Id: key,
                    count: value,
                    color: this.getFillColor( 'default' )
                  });
            }
          }
        });
        return resultArray;
    }

    colorFieldPropertyCount = (array, searchString) => {
        let resultCount = 0; 
        if ( (this.colorFieldProperty !== null) && (this.colorFieldProperty !== '') ) {
            console.log('colorFieldPropertyCount this.colorFieldProperty: ',this.colorFieldProperty);
            resultCount = array.filter(item => item[this.colorFieldProperty].value === searchString).length;
        }
        return resultCount;
    };

    hasLightningWebSecurityEnabled() {
        try {
          // eslint-disable-next-line no-new, @locker/locker/distorted-worker-constructor
          new Worker();
        } catch ({ message }) {
          if (message.includes('Lightning Web Security: Cannot create Worker')) {
            console.log('LWC enabled in org');
            return true;
          }
        }
        console.log('LWC _not_ enabled in org');
        return false;
    }

    connectedCallback() {
        let lwsIsEnabled = this.hasLightningWebSecurityEnabled();

        if (lwsIsEnabled) {
            this.refreshHandlerID = registerRefreshHandler(
                this,
                this.refreshHandler
            );
        } else {
            this.refreshHandlerID = registerRefreshHandler(this.template.host, this.refreshHandler.bind(this));
        }
    }

    disconnectedCallback() {
        unregisterRefreshHandler(this.refreshHandlerID);
    }

    async refreshHandler() {
        console.log('** inside refreshHandler **');
        this.showFooter=false;

        // this.refreshGraphQL(this.graphqlQueryResult);
        await refreshGraphQL(this.graphqlQueryResult);
    }   
    

    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    objectInfo({ error, data }) {
        console.log('* pOI - inside parent object objectInfo wire *');
        if (data) {
            console.log('pOI got data');
            if(data.childRelationships){
                //this.childObjPlural=trimEndSubstring(this.childRelNameProperty,'__r').replaceAll('_',' '); //take out __r if present, and replace _'s        
                this.theChildRel = this.childRelationshipName(data.childRelationships);
                console.log('pOI - childRelationshipName json:\n'+JSON.stringify(this.theChildRel));
                this.iconName= iconName(this.theChildRel.childObjectApiName);
                this.theChildObjAPIName=this.theChildRel.childObjectApiName;
                // theChildObjectAPIName='Child_Test_Object__c';
                console.log('pOI - theChildObjAPIName now set to:',this.theChildObjAPIName);
                this.childRelQhold=false;  // this flag keeps merged_query undefined until now that theChildRel is defined/has data 
                // globalQueryString=this.merged_query_str;
                // console.log('pOI - globalQueryString set to:',globalQueryString);
             }
        } else {
            console.log('pOI - no data yet');
        }
        if (error) {
            console.error('pOI - UI-API parent getObjectInfo query error: '+ error);
        }
    }

    @wire(getObjectInfo, { objectApiName: '$theChildObjAPIName' })
        childObjectInfo({ error, data }) {
            console.log(' ** cOI inside childObjectInfo wire ** ');
            console.log(' ** cOI child Obj: ',this.theChildObjAPIName);
            if (data) {
                console.log('cOI got data - childObj: ',this.theChildObjAPIName);
                console.log('cOI its objectInfo:',JSON.stringify(data));
                this.childObjQhold=false;
                // next 2 lines may create bugs if there is a 2nd reference field starting w "Location" in its API name on the Child obj
                this.locationLU = findLocationReferenceField(data.fields,'Location')[0].value.apiName;
                this.locationRLU = findLocationReferenceField(data.fields,'Location')[0].value.relationshipName;

                this.childObjPlural=data.labelPlural;

                if (this.colorFieldProperty !== null) {
                    this.colorFieldLabel = findField(data.fields,this.colorFieldProperty)[0].value.label;
                    this.byColorFieldLabel = 'by '+ this.colorFieldLabel;
                    console.log('childObj colorField label:',this.colorFieldLabel);
                }

                if ( this.descriptionFieldProperty !== null) {
                    this.descriptionFieldLabel = findField(data.fields,this.descriptionFieldProperty)[0].value.label;
                    console.log('childObj descField label:',this.descriptionFieldLabel);
                }    

                globalQueryString=this.merged_query_str;
                console.log('globalQueryString set to:',globalQueryString);
            } else {
                console.log('cOI - no data yet');
            }
            if (error) {
                console.error('* cOI UI-API child getObjectInfo query error: '+ error);
            }
        }    
    


    // Variables for the GraphQL query
    get variables() {
        if ( this.recordId && (this.theChildObjAPIName !== null) &&  (!this.childObjQhold) ) {
            console.log('recordId set for gql');         
            return { recordId: this.recordId };
        } 
        return undefined;
    }

   propStringForQuery(thePropString) {
        if ( (thePropString==null) || (thePropString.length===0)   ) {
            return '';
        } 
        return thePropString+' @category(name: "StringValue") {value}';
    }

    get merged_query_str() {
        var theQueryStr;
        console.log('inside merged_query_str()');
        // TODO: figure out if I need the next 4 lines back or not, and whether hold vars needed too
        // if ( ( (this.childRelQhold) || this.childObjQhold || (this.theChildRel==null)  ) ) {
        //         console.log('gQLmerge - merged_query_str() getter not ready yet');
        //         return undefined;
        // } 
        theQueryStr=`
        ${gql_template({childobj_param: this.theChildRel.childObjectApiName,lookup_param: this.theChildRel.fieldName,
            LocationLU_param:this.locationLU,LocationRLU_param:this.locationRLU,
            f1_param:this.propStringForQuery(this.nameTitleFieldProperty),f2_param:this.propStringForQuery(this.descriptionFieldProperty),f3_param:this.propStringForQuery(this.colorFieldProperty)})}
        `;
        console.log('theQueryStr: '+theQueryStr);
        return theQueryStr
    }

    @wire(graphql, {
    //   query: '$merged_query',
    query: gql`${globalQueryString}`,
    variables: '$variables'
    })
    wiredValues(result) {
      const { data, errors } = result;  
      this.graphqlQueryResult = result;

      console.log('** gQL inside graphql wire **');
      console.log('** gQL objectApiName: '+this.objectApiName); 
      if (data) {
        console.log('gQL got data');
        console.log('** gQL gql q result: '+JSON.stringify(data));

        this.results = data.uiapi.query[this.theChildRel.childObjectApiName].edges.map((edge) => edge.node);

        this.results=grepNonNullRecords(this.results,this.locationRLU);

        console.log('edge map json: '+JSON.stringify(this.results));

        this.queryResultCount=this.results.length;
        console.log('number of child records in q result: '+ this.queryResultCount);
        this.showFooter=false;

        if (this.queryResultCount>0) {
            this.showMap=true;
            this.noMarkersToShow=false;

            this.colorFieldPropValuesCountMap = new Map();
            
            // call me lazy ...
            this.setPicklistColorsMap(this.plValue1Property,this.color1Prop);
            this.setPicklistColorsMap(this.plValue2Property,this.color2Prop);
            this.setPicklistColorsMap(this.plValue3property,this.color3Prop);
            this.setPicklistColorsMap(this.plValue4Property,this.color4Prop);
            this.setPicklistColorsMap(this.plValue5Property,this.color5Prop);

            console.log('picklistColorsMap:\n',this.picklistColorsMap);

            this.colorFieldPropValuesCountMap = new Map();
            if (this.colorFieldProperty !== null) {
                this.picklistColorsMap.forEach((value, key) => {
                    var cfPropCount = this.colorFieldPropertyCount(this.results,key);
                    if (cfPropCount>0) {
                        this.colorFieldPropValuesCountMap.set(key, cfPropCount );
                    }
                  });
            }

            let customColorsCount = sumOfMapValues(this.colorFieldPropValuesCountMap)  
            let leftOverResultsCount = this.queryResultCount - customColorsCount;
            if ( leftOverResultsCount > 0 ) {
                if (customColorsCount>0) {
                    this.colorFieldPropValuesCountMap.set('other values (default color)', leftOverResultsCount );   
                } else {
                    this.colorFieldPropValuesCountMap.set('default color', leftOverResultsCount );
                }
            }
            console.log('colorFieldPropValuesCountMap:\n',this.colorFieldPropValuesCountMap);

            this.markersColorsKey=this.combineMapsIntoMarkerColorsJSON(this.colorFieldPropValuesCountMap,this.picklistColorsMap);
            console.log('markersColorsKey:\n', JSON.stringify(this.markersColorsKey) );

            this.mapMarkers = this.results.map( (item) => (
                {                   
                    location: {
                        Latitude: item[this.locationRLU].Latitude.value,
                        Longitude: item[this.locationRLU].Longitude.value,
                        Street: parseAddressFieldValue(item[this.locationRLU].LTK_AddressJSON__c.value,'Street'),
                        City: parseAddressFieldValue(item[this.locationRLU].LTK_AddressJSON__c.value,'City'),
                        State: parseAddressFieldValue(item[this.locationRLU].LTK_AddressJSON__c.value,'State'),
                        PostalCode: parseAddressFieldValue(item[this.locationRLU].LTK_AddressJSON__c.value,'PostalCode'),
                        Country: parseAddressFieldValue(item[this.locationRLU].LTK_AddressJSON__c.value,'Country'),
                    },
                    value: item.Id,
                    title: getNestedValue(item,this.nameTitleFieldProperty,'value'),
                    description: getNestedValue(item,this.descriptionFieldProperty,'value'),
                    mapIcon: {
                        path: mapMarkerSvgPath,
                        fillColor: this.getFillColorByPropValue(getNestedValue(item,this.colorFieldProperty,'value')),
                        fillOpacity: 1,
                        strokeOpacity: 1,
                        strokeColor: '#000',  // black
                        strokeWeight: 1,
                        scale: 1,
                        anchor: {x: 0, y: 0}
                    }
                }
            ));
            console.log("** MARKERS: ", JSON.stringify(this.mapMarkers));
                        
        } else {
            this.showMap=false;
            this.showFooter=false;
            this.noMarkersToShow=true;
            console.log('gQL - empty result from gql query');
        }
      } else {
        this.showMap=false;
        this.showFooter=false;
        this.noMarkersToShow=true;
        console.log('gQL - no data result from gql query');
      }
      if (errors){
        this.errors = errors;
        console.log('** gQL errors: '+JSON.stringify(errors));
        }
    }

    handleMarkerSelect(event) {
        // Currently selected marker data
        this.selectedMarker = this.mapMarkers.find(
        (marker) => marker.value === event.detail.selectedMarkerValue);

        console.log('selectedMarker: '+JSON.stringify(this.selectedMarker));
        
        this.linkURL = "../../"+this.selectedMarker.value+"/view";
        this.DescriptionField_propValue=this.selectedMarker.description;

        if (this.colorFieldProperty!==null) {
            this.colorFieldPropertyValue=findColorFieldPropertyById(this.results,this.colorFieldProperty , this.selectedMarker.value);
            console.log('this.colorFieldPropertyValue: '+this.colorFieldPropertyValue);
        }

        this.selectedMarkerTitle = this.selectedMarker.title;
        console.log('this.linkURL: '+this.linkURL);
        this.showFooter = true;  
    }

    async refreshComponent() {
        console.log('refresh button pressed');
        this.isLoading = true;
        this.showFooter = false;
        this.dispatchEvent(new RefreshEvent());
        return refreshGraphQL(this.graphqlQueryResult);
    }

    getFillColorByPropValue(theValue){
        console.log('status key for picklistColorsMap: '+theValue);
        const theColorProp = this.picklistColorsMap.get(theValue);
        console.log('marker color: '+theColorProp);
        return this.getFillColor(theColorProp);
    }

    setPicklistColorsMap(theValueProp,theColorProp){
        if (theValueProp == null) {
            console.log('empty value - not adding item to picklistColorsMap')
        } else {
            this.picklistColorsMap.set(theValueProp,theColorProp);
        }

    }

    setColorFieldPropValuesCountMap(theValueProp,itsCount){
        if (theValueProp == null) {
            console.log('empty value - not adding item to colorFieldPropValuesCountMap')
        } else {
            this.colorFieldPropValuesCountMap.set(theValueProp,itsCount);
        }
    }

    getFillColor(thePropValue){
        var res;
        // blue 🔵,green 🟢,red 🔴,orange 🟠,yellow 🟡,purple 🟣,brown 🟤,white ⚪
        switch (thePropValue) {
            case 'blue':
            case 'blue 🔵':
              res='#0099FF';
              break;
            case 'green': 
            case 'green 🟢': 
              res='#00FF00';
              break; 
            case 'red': 
            case 'red 🔴': 
              res='#FF0000';
              break; 
            case 'orange':
            case 'orange 🟠':
              res='#FF6600';
              break;
            case 'yellow':   
            case 'yellow 🟡': 
                res='#FFFF66';
                break;
            case 'purple': 
            case 'purple 🟣': 
                res='#9900FF';
                break;
            case 'brown':
            case 'brown 🟤':
              res='#BF8040';
              break;
            case 'white':
            case 'white ⚪':
              res='#FFFFFF';
              break;    
            default:
              res=this.getFillColor(this.defaultColorProp); 
              console.log("no matching color for Property, using default: "+this.defaultColorProp);
          }
        return res;
    }

    get cardTitle() {
        return 'Related Records Map';
    }

    childRelationshipName(childRelsObj) {
        var fresult = findByRelName(childRelsObj,this.childRelNameProperty);  // typ for std objs
        var iresult = null;
        var returnResult = null;
        if (  typeof(fresult) === "undefined" ) {                
                fresult = findByRelName(childRelsObj,this.childRelNameProperty+'__r');  // typ for custom objs
                if (  typeof(fresult) === "undefined" ) {
                    console.log('findByRelName result undefined, trying includesByRelName ...');
                    iresult = includesByRelName(childRelsObj,this.childRelNameProperty+'__r');  // for packaged objs w prefixed API names
                    if (  typeof(iresult) === "undefined" ) {
                        console.log('includesByRelName result undefined');
                    } else if (iresult.length===1) {
                        console.log('includesByRelName result: '+JSON.stringify(iresult[0]));
                        returnResult= iresult[0];
                    }
                } else {
                    console.log('findByRelName result: '+JSON.stringify(fresult));
                    returnResult= fresult;
                }             
            } else if ( typeof(fresult.fieldName) !== "undefined" ) {
                console.log('findByRelName result: '+JSON.stringify(fresult));
                returnResult= fresult;
            }
        return returnResult;    
    }

}