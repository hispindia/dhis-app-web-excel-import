/* global angular */

'use strict';

/* Controllers */
var excelUploadControllers = angular.module('excelUploadControllers', [])

//Controller for settings page
.controller('MainController', 
            function($rootScope,
                    $scope,
                    $timeout,
                    orderByFilter,
                    ExcelMappingService,
                    MetaDataFactory,
                    CurrentSelection,
                    OrgUnitService,
                    PeriodService) {
    
    $scope.showExcelUploadMenu = true;
    $scope.showExcelMappingMenu = false;
    $scope.selected = {};    
    
    $scope.dataSets = [];
    $("#orgUnitTree").addClass("disable-clicks");
    MetaDataFactory.getAll('dataSets').then(function(dss){
        angular.forEach(dss, function(ds){
            ds.ous = {};
            angular.forEach(ds.organisationUnits, function(ou){
                ds.ous[ou.id] = ou.name;
            });
            delete ds.organisationUnits;            
        });
        $scope.dataSets = dss;
    });
    
    if($scope.selected.dataSet){
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
    }
    
    
    var getChildren = function(ou){
        if(!ou.c || !ou.c.length){
            $scope.ouTree.push(ou);
        }
        else{
            angular.forEach(ou.c, function(c){
                OrgUnitService.get(c).then(function(o){                    
                    if(angular.isObject(o)){
                        o.name = ou.name + ' ' + o.n;
                        o.id = c;
                        getChildren(o);
                    }                    
                });
            });
        }
    };
    
    var populateOus = function(){
        if(angular.isObject($scope.selectedOrgUnit)){
            $scope.ouTree = [];
            if($scope.selected.dataSet && $scope.selected.dataSet.ous && $scope.selected.dataSet.ous[$scope.selectedOrgUnit.id]){
                console.log('the ou:  ', $scope.selectedOrgUnit);
                $scope.ouTree.push($scope.selectedOrgUnit);
            }
            OrgUnitService.open().then(function(){                
                getChildren($scope.selectedOrgUnit);
            });
        }
    };
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {        
        populateOus();
    });
    
    $scope.row = {model: 'DE'};
    
    var setSelections =  function(){
        $scope.validOus = orderByFilter($scope.validOus, '-name').reverse();
        CurrentSelection.set({  ou: $scope.selectedOrgUnit,
                                ous: $scope.validOus, 
                                ds: $scope.selected.dataSet, 
                                des: $scope.selectedDataElements, 
                                pr: $scope.selected.period, 
                                row: $scope.row.model, 
                                tmp: $scope.selected.template,
                                showExcelMappingMenu: $scope.showExcelMappingMenu, 
                                showExcelUploadMenu: $scope.showExcelUploadMenu
                            });
    };
    
    //watch for changes in due/event-date
    var broadCastSelections = function (){
        
        //get dataelements for the selected dataset
        var deIds = [];
        angular.forEach($scope.selected.dataSet.dataElements, function(de){
            if(de.id){
                deIds.push(de.id);
            }                
        });                

        MetaDataFactory.getMultiple('dataElements', deIds).then(function (des){  
            /*angular.forEach(des, function(de){
                console.log('de.combo:  ', de.categoryCombo && de.categoryCombo.id ? de.categoryCombo.id : '', ' - ', de.name);
            });*/
            $scope.selectedDataElements = des;
            $scope.selectedDataElements = orderByFilter($scope.selectedDataElements, '-name').reverse();
            
            setSelections();        
            
            $timeout(function() { 
                $rootScope.$broadcast('excelImport', {});            
            }, 100);
        });        
    };
    
    $scope.getDataSetDetails = function(){        
        
        $scope.selectedDataElements = [];
        $scope.periods = [];
        
        if($scope.selected.dataSet && 
                $scope.selected.dataSet.periodType &&
                $scope.selected.dataSet.dataElements && 
                $scope.selected.dataSet.dataElements.length > 0){ 
            
            //get periods
            $scope.periods = PeriodService.getPeriods($scope.selected.dataSet.periodType);
            
            $scope.validOus = [];
            angular.forEach($scope.ouTree, function(ou){                
                if($scope.selected.dataSet.ous && $scope.selected.dataSet.ous[ou.id]){                
                    $scope.validOus.push(ou);
                }            
            });
        }
    };    
    
    $scope.getMapping = function(){        
        
        if($scope.selected.dataSet.id && $scope.selected.period && $scope.selectedOrgUnit.id && $scope.row.model){
            
            var layout = 'DEs as rows and OUs as columns';
            if($scope.row.model === 'OU'){
                layout = 'OUs as rows and DEs as columns';
            };
            
            var  key = 'key-excelMapping-' + $scope.selected.dataSet.id + '-' + $scope.selectedOrgUnit.id + '-' + $scope.row.model;
            $scope.templates = [];
            ExcelMappingService.get(key).then(function(response){
                if(response){
                    $scope.templates.push({key: key, mapping: response, name: 'Template with ' + layout});
                    
                    console.log('the mapping:  ', $scope.templates);
                }
            });
        }
    };
        
    $scope.showExcelUpload = function(){
        $scope.showExcelUploadMenu = true;
        $scope.showExcelMappingMenu = false;
    };
    
    $scope.showExcelMapping = function(){
        $scope.showExcelUploadMenu = false;
        $scope.showExcelMappingMenu = true;
    };   
    
    //watch for event editing
    $scope.$watchCollection('[row.model, selected.dataSet, selected.period, selected.template]', function() {
        if($scope.showExcelMappingMenu){
            if($scope.row.model && $scope.selected.dataSet){
                broadCastSelections();
            }
        }
        else{
            if($scope.selected.dataSet && $scope.selected.period && $scope.selected.template){
                broadCastSelections();
            }
        }
    });    
});
