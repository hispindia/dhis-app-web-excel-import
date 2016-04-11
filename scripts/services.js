/* global angular, dhis2 */

'use strict';

/* Services */

var excelUploadServices = angular.module('excelUploadServices', ['ngResource'])

.factory('XLStorageService', function(){
    var store = new dhis2.storage.Store({
        name: 'dhis2xls',
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['dataSets', 'categoryCombos', 'dataElements', 'ouLevels',  'constants', 'dataValues']
    });
    return{
        currentStore: store
    };
})

.factory('OfflineXLStorageService', function($http, $q, $rootScope, XLStorageService){
    return {        
        hasLocalData: function() {
            var def = $q.defer();
            XLStorageService.currentStore.open().done(function(){
                XLStorageService.currentStore.getKeys('dataValues').done(function(events){
                    $rootScope.$apply(function(){
                        def.resolve( events.length > 0 );
                    });                    
                });
            });            
            return def.promise;
        },
        getLocalData: function(){
            var def = $q.defer();            
            XLStorageService.currentStore.open().done(function(){
                XLStorageService.currentStore.getAll('dataValues').done(function(events){
                    $rootScope.$apply(function(){
                        def.resolve({events: events});
                    });                    
                });
            });            
            return def.promise;
        },
        uploadLocalData: function(){            
            var def = $q.defer();
            this.getLocalData().then(function(localData){                
                var evs = {events: []};
                angular.forEach(localData.events, function(ev){
                    ev.event = ev.id;
                    delete ev.id;
                    evs.events.push(ev);
                });

                $http.post('../api/events', evs).then(function(evResponse){                            
                    def.resolve();
                });                      
            });
            return def.promise;
        }
    };
})

/* factory for handling program related meta-data */
.factory('MetaDataFactory', function($q, $rootScope, XLStorageService) {
    return {        
        get: function(store, uid){            
            var def = $q.defer();            
            XLStorageService.currentStore.open().done(function(){
                XLStorageService.currentStore.get(store, uid).done(function(obj){                    
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });                        
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();            
            XLStorageService.currentStore.open().done(function(){
                XLStorageService.currentStore.getAll(store).done(function(objs){                       
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });                
            });            
            return def.promise;
        },
        getMultiple: function(store, uids){            
            var def = $q.defer();            
            XLStorageService.currentStore.open().done(function(){
                XLStorageService.currentStore.getAll(store).done(function(objs){
                    var des = [];                   
                    angular.forEach(objs, function(obj){
                        if(obj.id && uids.indexOf(obj.id) !== -1){
                            des.push(obj);
                        }
                    });                    
                    $rootScope.$apply(function(){
                        def.resolve(des);
                    });
                });
            });                        
            return def.promise;
        }
    };        
})

/* current selections */
.service('PeriodService', function(){
    
    this.getPeriods = function(periodType){
        var pt = new PeriodType();
        var d2Periods = pt.get(periodType).generatePeriods({offset: 0, filterFuturePeriods: false, reversePeriods: false});     
        return d2Periods;
    };
})

/* Service to fetch/store excel mappings*/
.service('ExcelMappingService', function($http) {
    
    return {
        save: function(key, value){
            value = JSON.stringify(value); 
			//console.log(value);
            var url = '../api/systemSettings/' + key ;           
            var promise = $http.post( url, value , {headers: {'Content-Type': 'text/plain;charset=utf-8'}}).then(function(response){
                return response.data;
            });
            return promise;            
        },
        get: function(key){
            var promise = $http.get(  '../api/systemSettings/' + key ).then(function(response){
                return response.data;
            }, function(){
                return null;
            });
            return promise;
        },
        importData: function(dataValueSet){
            var url = "../api/dataValueSets";
			var header = {	'Accept': 'application/json','Content-Type': 'application/json'	};
			var dataJSON = JSON.stringify(dataValueSet);
			
			var promise = $http({ method : 'post', url : url, headers: header, data : dataJSON })
			.success( function( response )
			{
				console.log( "response : "+response );
			})
			.error( function( response )
			{
				console.log( "response : " + response );
				console.log( "Internal Error : " + response.description);
			});
            return promise;
        }
    };
})

.service('ExcelReaderService', function($q, $rootScope){
    
    var service = function(data) {
        angular.extend(this, data);
    };

    service.readFile = function(file, readCells, toJSON) {
        var deferred = $q.defer();

        XLSXReader(file, readCells, toJSON, function(data) {
            $rootScope.$apply(function() {
                deferred.resolve(data);
            });
        });

        return deferred.promise;
    };

    return service; 
})

.factory('ValidationRuleService', function(){
    return {
        isValid: function() {
            return true;
        }
    };
})

/* current selections */
.service('CurrentSelection', function(){
    this.currentSelections = '';
    
    this.set = function(currentSelections){  
        this.currentSelections = currentSelections;        
    };    
    this.get = function(){
        return this.currentSelections;
    };
})

/*Orgunit service for local db */
.service('OrgUnitService', function($window, $q){
    
    var indexedDB = $window.indexedDB;
    var db = null;
    
    var open = function(){
        var deferred = $q.defer();
        
        var request = indexedDB.open("dhis2ou");
        
        request.onsuccess = function(e) {
          db = e.target.result;
          deferred.resolve();
        };

        request.onerror = function(){
          deferred.reject();
        };

        return deferred.promise;
    };
    
    var get = function(uid){
        
        var deferred = $q.defer();
        
        if( db === null){
            deferred.reject("DB not opened");
        }
        else{
            var tx = db.transaction(["ou"]);
            var store = tx.objectStore("ou");
            var query = store.get(uid);
                
            query.onsuccess = function(e){
                if(e.target.result){
                    deferred.resolve(e.target.result);
                }
                else{
                    var t = db.transaction(["ouPartial"]);
                    var s = t.objectStore("ouPartial");
                    var q = s.get(uid);
                    q.onsuccess = function(e){
                        deferred.resolve(e.target.result);
                    };
                }            
            };
        }
        return deferred.promise;
    };
    
    return {
        open: open,
        get: get
    };    
});