
/* global dhis2, angular, i18n_ajax_login_failed, _, selection, selection */

dhis2.util.namespace('dhis2.xls');

// whether current user has any organisation units
dhis2.xls.emptyOrganisationUnits = false;

var i18n_no_orgunits = 'No organisation unit attached to current user, no data entry possible';
var i18n_offline_notification = 'You are offline, data will be stored locally';
var i18n_online_notification = 'You are online';
var i18n_need_to_sync_notification = 'There is data stored locally, please upload to server';
var i18n_sync_now = 'Upload';
var i18n_sync_success = 'Upload to server was successful';
var i18n_sync_failed = 'Upload to server failed, please try again later';
var i18n_uploading_data_notification = 'Uploading locally stored data to the server';

var PROGRAMS_METADATA = 'EVENT_PROGRAMS';

var EVENT_VALUES = 'EVENT_VALUES';
var desInPromise = [];
var cocosInPromise = [];
var ccsInPromise = [];

dhis2.xls.store = null;
dhis2.xls.memoryOnly = $('html').hasClass('ie7') || $('html').hasClass('ie8');
var adapters = [];    
if( dhis2.xls.memoryOnly ) {
    adapters = [ dhis2.storage.InMemoryAdapter ];
} else {
    adapters = [ dhis2.storage.IndexedDBAdapter, dhis2.storage.DomLocalStorageAdapter, dhis2.storage.InMemoryAdapter ];
}

dhis2.xls.store = new dhis2.storage.Store({
    name: 'dhis2xls',
    adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
    objectStores: ['dataSets', 'categoryCombos', 'dataElements', 'ouLevels',  'constants', 'dataValues']
});

(function($) {
    $.safeEach = function(arr, fn)
    {
        if (arr)
        {
            $.each(arr, fn);
        }
    };
})(jQuery);

/**
 * Page init. The order of events is:
 *
 * 1. Load ouwt 2. Load meta-data (and notify ouwt) 3. Check and potentially
 * download updated forms from server
 */
$(document).ready(function()
{
    $.ajaxSetup({
        type: 'POST',
        cache: false
    });

    $('#loaderSpan').show();
    
});


$(document).bind('dhis2.online', function(event, loggedIn)
{
    if (loggedIn)
    {   
        var OfflineXLStorageService = angular.element('body').injector().get('OfflineXLStorageService');

        OfflineXLStorageService.hasLocalData().then(function(localData){
            if(localData){
                var message = i18n_need_to_sync_notification
                    + ' <button id="sync_button" type="button">' + i18n_sync_now + '</button>';

                setHeaderMessage(message);

                $('#sync_button').bind('click', uploadLocalData);
            }
            else{
                if (dhis2.xls.emptyOrganisationUnits) {
                    setHeaderMessage(i18n_no_orgunits);
                }
                else {
                    setHeaderDelayMessage(i18n_online_notification);
                }
            }
        });
    }
    else
    {
        var form = [
            '<form style="display:inline;">',
            '<label for="username">Username</label>',
            '<input name="username" id="username" type="text" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<label for="password">Password</label>',
            '<input name="password" id="password" type="password" style="width: 70px; margin-left: 10px; margin-right: 10px" size="10"/>',
            '<button id="login_button" type="button">Login</button>',
            '</form>'
        ].join('');

        setHeaderMessage(form);
        ajax_login();
    }
});

$(document).bind('dhis2.offline', function()
{
    if (dhis2.xls.emptyOrganisationUnits) {
        setHeaderMessage(i18n_no_orgunits);
    }
    else {
        setHeaderMessage(i18n_offline_notification);
    }
});
    
function ajax_login()
{
    $('#login_button').bind('click', function()
    {
        var username = $('#username').val();
        var password = $('#password').val();

        $.post('../dhis-web-commons-security/login.action', {
            'j_username': username,
            'j_password': password
        }).success(function()
        {
            var ret = dhis2.availability.syncCheckAvailability();

            if (!ret)
            {
                alert(i18n_ajax_login_failed);
            }
        });
    });
}

function downloadMetaData(){    
    
    console.log('Loading required meta-data');
    var def = $.Deferred();
    var promise = def.promise();
    
    promise = promise.then( dhis2.xls.store.open );    
    promise = promise.then( getUserRoles );
    promise = promise.then( getCalendarSetting );
    promise = promise.then( getConstants );
    promise = promise.then( getOrgUnitLevels );    
    promise = promise.then( getMetaDataSets );     
    promise = promise.then( getDataSets );     
    promise = promise.then( getDataElements );
    promise = promise.then( getDataElementCategoryCombos );
    promise = promise.then( getDataSetCategoryCombos );
    promise.done( function() {    
        //Enable ou selection after meta-data has downloaded
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
        
        console.log( 'Finished loading meta-data' ); 
        dhis2.availability.startAvailabilityCheck();
        console.log( 'Started availability check' );
        selection.responseReceived();
        
        var SessionStorageService = angular.element('body').injector().get('SessionStorageService');
        SessionStorageService.set('TRACKER_METADATA_DOWNLOADED', 'true');
    });         

    def.resolve();
}

function getUserRoles()
{
    var SessionStorageService = angular.element('body').injector().get('SessionStorageService');
    
    if( SessionStorageService.get('USER_ROLES') ){
       return; 
    }
    
    var def = $.Deferred();

    $.ajax({
        url: '../api/me.json?fields=id,name,userCredentials[userRoles[id,authorities]]',
        type: 'GET'
    }).done(function(response) {
        SessionStorageService.set('USER_ROLES', response);
        def.resolve();
    }).fail(function(){
        def.resolve();
    });

    return def.promise();
}

function getCalendarSetting()
{
    if(localStorage['CALENDAR_SETTING']){
       return; 
    }    
    var def = $.Deferred();

    $.ajax({
        url: '../api/systemSettings?key=keyCalendar&key=keyDateFormat',
        type: 'GET'
    }).done(function(response) {
        localStorage['CALENDAR_SETTING'] = JSON.stringify(response);
        def.resolve();
    }).fail(function(){
        def.resolve();
    });

    return def.promise();
}

function getConstants()
{
    dhis2.xls.store.getKeys( 'constants').done(function(res){        
        if(res.length > 0){
            return;
        }        
        return getD2Objects('constants', 'constants', '../api/constants.json', 'paging=false&fields=id,name,displayName,value');        
    });    
}

function getOrgUnitLevels()
{
    dhis2.xls.store.getKeys( 'ouLevels').done(function(res){        
        if(res.length > 0){
            return;
        }        
        return getD2Objects('ouLevels', 'organisationUnitLevels', '../api/organisationUnitLevels.json', 'filter=level:gt:1&fields=id,name,level&paging=false');
    });    
}

function getMetaDataSets()
{
    var def = $.Deferred();

    $.ajax({
        url: '../api/dataSets.json',
        type: 'GET',
        data:'paging=false&fields=id,version,categoryCombo[id],dataElements[id,categoryCombo[id]]'
    }).done( function(response) {        
        def.resolve( response.dataSets ? response.dataSets : [] );
    }).fail(function(){
        def.resolve( null );
    });
    
    return def.promise(); 
}

function getDataSets( dataSets )
{
    if( !dataSets ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    _.each( _.values( dataSets ), function ( dataSet ) {
        
        if(dataSet.dataElements){
            build = build.then(function() {
                var d = $.Deferred();
                var p = d.promise();
                dhis2.xls.store.get('dataSets', dataSet.id).done(function(obj) {
                    if(!obj || obj.version !== dataSet.version) {
                        promise = promise.then( getD2Object( dataSet.id, 'dataSets', '../api/dataSets', 'fields=id,name,code,shortName,version,periodType,displayName,displayShortName,categoryCombo[id,categoryOptionCombos[id]],dataElements[id,categoryCombo[id,categoryOptionCombos[id]]],organisationUnits[id,name]', 'idb' ) );
                    }
                    d.resolve();
                });
                return p;
            });
        }        
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            mainDef.resolve( dataSets );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;
}

function getDataElements( dataSets )
{
    if( !dataSets ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    _.each( _.values( dataSets ), function ( dataSet ) {        
        if(dataSet.dataElements){            
            _.each(_.values(dataSet.dataElements), function(de){
                if( de.id ){
                    build = build.then(function() {
                        var d = $.Deferred();
                        var p = d.promise();
                        dhis2.xls.store.get('dataElements', de.id).done(function(obj) {
                            if( (!obj || obj.version !== de.version) && desInPromise.indexOf(de.id) === -1) {
                                desInPromise.push( de.id );
                                promise = promise.then( getD2Object( de.id, 'dataElements', '../api/dataElements', 'fields=id,name,version,type,numberType,domainType,categoryCombo[id]', 'idb' ) );
                            }
                            d.resolve();
                        });

                        return p;
                    });
                }            
            });
        }              
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            mainDef.resolve( dataSets );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;    
}

function getDataElementCategoryCombos( dataSets )
{
    if( !dataSets ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    _.each( _.values( dataSets ), function ( dataSet ) {        
        if(dataSet.dataElements){            
            _.each(_.values(dataSet.dataElements), function(de){
                if( de.categoryCombo && de.categoryCombo.id ){
                    build = build.then(function() {
                        var d = $.Deferred();
                        var p = d.promise();
                        dhis2.xls.store.get('categoryCombos', de.categoryCombo.id).done(function(obj) {
                            if( (!obj || obj.version !== de.categoryCombo.version) && ccsInPromise.indexOf(de.categoryCombo.id) === -1) {
                                ccsInPromise.push( de.categoryCombo.id );
                                promise = promise.then( getD2Object( de.categoryCombo.id, 'categoryCombos', '../api/categoryCombos', 'fields=id,name,skipTotal,categoryOptionCombos[id,name,shortName,displayName]', 'idb' ) );
                            }
                            d.resolve();
                        });
                        return p;
                    });
                }
            });
        }
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            mainDef.resolve( dataSets );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;    
}

function getDataSetCategoryCombos( dataSets )
{
    if( !dataSets ){
        return;
    }
    
    var mainDef = $.Deferred();
    var mainPromise = mainDef.promise();

    var def = $.Deferred();
    var promise = def.promise();

    var builder = $.Deferred();
    var build = builder.promise();

    _.each( _.values( dataSets ), function ( dataSet ) {        
        if(dataSet.categoryCombo && dataSet.categoryCombo.id){            
           build = build.then(function() {
                var d = $.Deferred();
                var p = d.promise();
                dhis2.xls.store.get('categoryCombos', dataSet.categoryCombo.id).done(function(obj) {
                    if( (!obj || obj.version !== dataSet.categoryCombo.version) && ccsInPromise.indexOf(dataSet.categoryCombo.id) === -1) {
                        ccsInPromise.push( dataSet.categoryCombo.id );
                        promise = promise.then( getD2Object( dataSet.categoryCombo.id, 'categoryCombos', '../api/categoryCombos', 'fields=id,name,skipTotal,categoryOptionCombos[id,name,shortName,displayName]', 'idb' ) );
                    }
                    d.resolve();
                });
                return p;
            });
        }
    });

    build.done(function() {
        def.resolve();

        promise = promise.done( function () {
            mainDef.resolve( dataSets );
        } );
    }).fail(function(){
        mainDef.resolve( null );
    });

    builder.resolve();

    return mainPromise;    
}

function getD2Objects(store, objs, url, filter)
{
    var def = $.Deferred();

    $.ajax({
        url: url,
        type: 'GET',
        data: filter
    }).done(function(response) {
        if(response[objs]){
            dhis2.xls.store.setAll( store, response[objs] );
        }            
        def.resolve();        
    }).fail(function(){
        def.resolve();
    });

    return def.promise();
}


function getD2Object( id, store, url, filter, storage )
{
    return function() {
        if(id){
            url = url + '/' + id + '.json';
        }
        return $.ajax( {
            url: url,
            type: 'GET',            
            data: filter
        }).done( function( response ){
            if(storage === 'idb'){
                if( response && response.id) {
                    dhis2.xls.store.set( store, response );
                }
            }
            if(storage === 'localStorage'){
                localStorage[store] = JSON.stringify(response);
            }            
            if(storage === 'sessionStorage'){
                var SessionStorageService = angular.element('body').injector().get('SessionStorageService');
                SessionStorageService.set(store, response);
            }            
        });
    };
}

function uploadLocalData()
{
    var OfflineXLStorageService = angular.element('body').injector().get('OfflineXLStorageService');
    setHeaderWaitMessage(i18n_uploading_data_notification);
     
    OfflineXLStorageService.uploadLocalData().then(function(){
        dhis2.xls.store.removeAll( 'events' );
        log( 'Successfully uploaded local events' );      
        setHeaderDelayMessage( i18n_sync_success );
        selection.responseReceived(); //notify angular
    });
}
