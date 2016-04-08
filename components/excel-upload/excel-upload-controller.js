/* global excelUpload, angular */

//Controller for excel importing
excelUpload.controller('ExcelUploadController',
        function($rootScope,
                $scope,
                $timeout,
                ExcelMappingService,
                CurrentSelection,
                ExcelReaderService) {
    
    var resetExcelParams = function(){
        $scope.showPreview = true;    
        $scope.validationRules = [];
        $scope.operators = [];
        $scope.sheets = [];
        $scope.excelFile = '';
        $scope.sheetNames = [];
        $scope.assignedModels = [];
        $scope.selectedSheetName = '';
        $scope.gridColumnOptions = [];
        $scope.gridRowOptions = [];
    };
    
       
    var selections = {};
    $scope.$on('excelImport', function() {
        resetExcelParams();
        selections = CurrentSelection.get();
        $scope.showExcelMappingMenu = selections.showExcelMappingMenu;
        $scope.showExcelUploadMenu = selections.showExcelUploadMenu;
    });    
    
    $scope.cancelUpload = function(){
        $timeout(function() { 
            $rootScope.$broadcast('excelImport', {});            
        }, 100);
    };
    
    var getColumnsAndRows = function(){
        
        if(selections.ds.id && selections.pr && selections.ou.id && selections.row && selections.tmp){
            
            console.log('the template:  ', selections.tmp);
            
            $scope.excelColumns = [];

            for(var i=0; i<$scope.sheets[$scope.selectedSheetName]["col_size"]; i++){
                if( selections.tmp.mapping && selections.tmp.mapping.cols && selections.tmp.mapping.cols[i]){
                    $scope.excelColumns.push({name: "", id: "", type: "", index: i, value: "", show: true, headerName: i, field: i});
                }
            }
            
            
            var rowCount = 0;
            angular.forEach($scope.sheets[$scope.selectedSheetName]["data"], function(row){                                
                if(selections.tmp.mapping && selections.tmp.mapping.rows && selections.tmp.mapping.rows[rowCount]){
                    
                    console.log('the data:  ', row, ' - ', rowCount);
                    
                    /*for(var i=1; i<$scope.sheets[$scope.selectedSheetName]["data"][rowCount].length; i++){
                        var isValid = ValidationRuleService.isValid(model.code, $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex], null, null);                
                        $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex].assigned = true;
                        $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex].isValid = isValid;                
                    }*/
                    
                    
                    /*for(var i=0; i<col.length; i++){
                        col[i] = {assigned: false, isValid: true, value: col[i]};
                    }*/
                }
                
                rowCount++;
            });
            
            $scope.gridOptions = {
                    columnDefs: $scope.excelColumns,
                    rowData: $scope.sheets[$scope.selectedSheetName]["data"]
                };
                
            /*var  key = 'key-excelMapping-' + selections.ds.id + '-' + selections.ou.id + '-' + selections.row;
            ExcelMappingService.get(key).then(function(response){
            
                console.log('the mapping:  ', response);
                
                $scope.excelColumns = [];

                for(var i=0; i<$scope.sheets[$scope.selectedSheetName]["col_size"]; i++){
                    $scope.excelColumns.push({name: "", id: "", type: "", index: i, value: "", show: true, headerName: i, field: i});
                }

                if( $scope.showExcelMappingMenu ){
                    angular.forEach($scope.sheets[$scope.selectedSheetName]["data"], function(col){                                
                        for(var i=0; i<col.length; i++){
                            col[i] = {assigned: false, isValid: true, value: col[i]};
                        }
                    });

                    if(selections.row === 'DE'){
                        $scope.gridRowOptions = selections.des;
                        $scope.gridColumnOptions = selections.ous;
                    }
                    else{
                        $scope.gridRowOptions = selections.ous;
                        $scope.gridColumnOptions = selections.des;
                    }
                }

                $scope.gridOptions = {
                    columnDefs: $scope.excelColumns,
                    rowData: $scope.sheets[$scope.selectedSheetName]["data"]
                };
            });*/
        }
        
    };
    
    $scope.fileChanged = function(files) {        
        resetExcelParams();        
        if(files.length > 0){
            $scope.excelFile = files[0];
            
            
            ExcelReaderService.readFile($scope.excelFile, $scope.showPreview).then(function(xlsxData) {
                $scope.sheets = xlsxData.sheets;
                $scope.sheetNames = [];
                for(var key in $scope.sheets){
                    $scope.sheetNames.push(key);
                }            
                if($scope.sheetNames.length === 1){                
                    $scope.selectedSheetName = $scope.sheetNames[0];
                    getColumnsAndRows();
                }
            });
        }
    };
 
    
    $scope.getSheet = function() {
        if ($scope.selectedSheetName && $scope.excelFile) {
            ExcelReaderService.readFile($scope.excelFile, $scope.showPreview).then(function(xlsxData) {
                $scope.sheets = xlsxData.sheets;
                getColumnsAndRows();
            });            
        }
    };    
    
});

/* global angular */

//'use strict';

/* Controllers */
/*var excelUploadControllers = angular.module('excelUploadControllers', [])

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
});*/

/*excelUpload.controller('ExcelUploadController',
        function($rootScope,
                $scope,
                $timeout,
                ExcelMappingService,
                ValidationRuleService,
                CurrentSelection,
                ExcelReaderService) {
    
    //Infinite Scroll
    $scope.infiniteScroll = {};
    $scope.infiniteScroll.optionsToAdd = 20;
    $scope.infiniteScroll.currentOptions = 20;
    
    $scope.resetInfScroll = function() {
        $scope.infiniteScroll.currentOptions = $scope.infiniteScroll.optionsToAdd;
    };
  
    $scope.addMoreOptions = function(){
        $scope.infiniteScroll.currentOptions += $scope.infiniteScroll.optionsToAdd;
    };
    
    var resetExcelParams = function(){
        $scope.showPreview = true;    
        $scope.validationRules = [];
        $scope.operators = [];
        $scope.sheets = [];
        $scope.excelFile = '';
        $scope.sheetNames = [];
        $scope.assignedModels = [];
        $scope.selectedSheetName = '';
        $scope.gridColumnOptions = [];
        $scope.gridRowOptions = [];
    };
    
       
    var selections = {};
    $scope.$on('excelImport', function() {
        resetExcelParams();
        selections = CurrentSelection.get(); 
        $scope.showExcelMappingMenu = selections.showExcelMappingMenu;
        $scope.showExcelUploadMenu = selections.showExcelUploadMenu;
    });    
    
    $scope.cancelUpload = function(){
        $timeout(function() { 
            $rootScope.$broadcast('excelImport', {});            
        }, 100);
    };
    
    var getColumnsAndRows = function(){
        $scope.excelColumns = [];
                
        for(var i=0; i<$scope.sheets[$scope.selectedSheetName]["col_size"]; i++){
            $scope.excelColumns.push({name: "", id: "", type: "", index: i, value: "", show: true, headerName: i, field: i});
        }
        
        if( $scope.showExcelMappingMenu ){
            angular.forEach($scope.sheets[$scope.selectedSheetName]["data"], function(col){                                
                for(var i=0; i<col.length; i++){
                    col[i] = {assigned: false, isValid: true, value: col[i]};
                }
            });
            
            if(selections.row === 'DE'){
                $scope.gridRowOptions = selections.des;
                $scope.gridColumnOptions = selections.ous;
            }
            else{
                $scope.gridRowOptions = selections.ous;
                $scope.gridColumnOptions = selections.des;
            }
        }
        
        if( $scope.showExcelUploadMenu ){
            $scope.gridOptions = {
                    columnDefs: $scope.excelColumns,
                    rowData: $scope.sheets[$scope.selectedSheetName]["data"]
                };
        }
    };
    
    $scope.fileChanged = function(files) {        
        resetExcelParams();        
        if(files.length > 0){
            $scope.excelFile = files[0];
            
            
            ExcelReaderService.readFile($scope.excelFile, $scope.showPreview).then(function(xlsxData) {
                $scope.sheets = xlsxData.sheets;
                $scope.sheetNames = [];
                for(var key in $scope.sheets){
                    $scope.sheetNames.push(key);
                }            
                if($scope.sheetNames.length === 1){                
                    $scope.selectedSheetName = $scope.sheetNames[0];
                    getColumnsAndRows();
                }
            });
        }
    };
 
    
    $scope.getSheet = function() {
        if ($scope.selectedSheetName && $scope.excelFile) {
            ExcelReaderService.readFile($scope.excelFile, $scope.showPreview).then(function(xlsxData) {
                $scope.sheets = xlsxData.sheets;
                getColumnsAndRows();
            });            
        }
    };
        
    $scope.assignColumnToModel = function(column, columnIndex){
        
        $scope.resetAssignedColumn(columnIndex);
        
        if(column.value){            
            if(column.value.id && columnIndex !== -1){                
                for(var i=0; i<$scope.gridColumnOptions.length; i++){
                    if($scope.gridColumnOptions[i].id === column.value.id ){
                        $scope.gridColumnOptions[i].assigned = true;
                        $scope.gridColumnOptions[i].assignedColumn = columnIndex;
                        $scope.validateColumnAgainstModel($scope.gridColumnOptions[i], columnIndex);
                        break;
                    }
                }
            }
        }
    };
    
    $scope.assignRowToModel = function(row, rowIndex){
        
        $scope.resetAssignedRow(rowIndex);
        
        if(row.value){
            if(row.value.id && rowIndex !== -1){                
                for(var i=0; i<$scope.gridRowOptions.length; i++){
                    if($scope.gridRowOptions[i].id === row.value.id ){
                        $scope.gridRowOptions[i].assigned = true;
                        $scope.gridRowOptions[i].assignedRow = rowIndex;
                        $scope.validateRowAgainstModel($scope.gridRowOptions[i], rowIndex);
                        break;
                    }
                }
            }
        }
    };
    
    $scope.resetAssignedColumn = function(columnIndex){
        if(columnIndex !== -1){
            for(var i=0; i<$scope.gridColumnOptions.length; i++){
                if($scope.gridColumnOptions[i].assignedColumn === columnIndex ){
                    $scope.gridColumnOptions[i].assigned = false;
                    $scope.gridColumnOptions[i].assignedColumn = -1;
                    break;
                }
            }
        }
    };
    
    $scope.resetAssignedRow = function(rowIndex){
        if(rowIndex !== -1){
            for(var i=0; i<$scope.gridRowOptions.length; i++){
                if($scope.gridRowOptions[i].assignedRow === rowIndex ){
                    $scope.gridRowOptions[i].assigned = false;
                    $scope.gridRowOptions[i].assignedRow = -1;
                    break;
                }
            }
        }
    };
    
    $scope.validateColumnAgainstModel = function(model, columnIndex){
        if( model.code && $scope.validationRules[model.code]){
            
            for(var i=1; i<$scope.sheets[$scope.selectedSheetName]["data"].length; i++){
                var isValid = ValidationRuleService.isValid(model.code, $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex], null, null);                
                $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex].assigned = true;
                $scope.sheets[$scope.selectedSheetName]["data"][i][columnIndex].isValid = isValid;                
            }
        }        
    };    
    
    $scope.validateRowAgainstModel = function(model, rowIndex){
        if( model.code && $scope.validationRules[model.code]){
            
            for(var i=1; i<$scope.sheets[$scope.selectedSheetName]["data"].length; i++){
                var isValid = ValidationRuleService.isValid(model.code, $scope.sheets[$scope.selectedSheetName]["data"][i][rowIndex], null, null);                
                $scope.sheets[$scope.selectedSheetName]["data"][i][rowIndex].assigned = true;
                $scope.sheets[$scope.selectedSheetName]["data"][i][rowIndex].isValid = isValid;                
            }
        }        
    };
    
    $scope.removeColumn = function(index){     
        $scope.excelColumns[index].show = false;
        for(var i=0; i<$scope.sheets[$scope.selectedSheetName]["data"].length; i++){
            $scope.sheets[$scope.selectedSheetName]["data"][i][index].removed = true;         
        }
    };
    
    $scope.removeRow = function(index){
        $scope.sheets[$scope.selectedSheetName]["data"][index].removed = true;
    };
});*/