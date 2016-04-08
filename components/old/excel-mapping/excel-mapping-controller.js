/* global excelUpload, angular */

//Controller for excel importing
excelUpload.controller('ExcelMappingController',
        function($rootScope,
                $scope,
                $timeout,
                $route,
                $filter,
                ExcelMappingService,
                ValidationRuleService,
                CurrentSelection,
                ExcelReaderService,
                MetaDataFactory,
                orderByFilter,
                OrgUnitService,
                DialogService) {
    
    $scope.row = {model: 'DE'};
    $scope.selected = {};
    $scope.startCoordinate = {};
    $scope.mappedDEs = {};
    $scope.mappedOUs = {};
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
        
        ExcelMappingService.get('key-excel-metadata-mapping').then(function(response){
            $scope.mappedDEs = response.des ? response.des : {};
            $scope.mappedOUs = response.ous ? response.ous : {} ;
        });
    });
    
    if($scope.selected.dataSet){
        $( "#orgUnitTree" ).removeClass( "disable-clicks" );
    }
    
    var getChildren = function(ou){
        if(!ou.c || !ou.c.length){
            return;
        }
        else{
            angular.forEach(ou.c, function(c){
                OrgUnitService.get(c).then(function(o){                    
                    if(angular.isObject(o)){
                        o.name = ou.name + ' ' + o.n;
                        o.id = c;
                        $scope.ouTree.push(o);
                        getChildren(o);
                    }                    
                });
            });
        }
    };
    
    var populateOus = function(){
        if(angular.isObject($scope.selectedOrgUnit)){
            $scope.ouTree = [];
            $scope.ouTree.push($scope.selectedOrgUnit);            
            OrgUnitService.open().then(function(){
                getChildren($scope.selectedOrgUnit);
            });
        }
    };
    
    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {  
		alert();
        populateOus();
    });
    
    $scope.setStartCoordinate = function(axis, pos){
        if(axis === 'row'){
            $scope.startCoordinate.row = pos;
        }
        else{
            $scope.startCoordinate.column = pos;
        }
        
        console.log('the start:  ', $scope.startCoordinate);
    };
    
    
    $scope.getDataSetDetails = function(){
        
        if($scope.selected.dataSet && $scope.selected.dataSet.dataElements){            
            
            $scope.validOus = [];
            angular.forEach($scope.ouTree, function(ou){
                if($scope.selected.dataSet.ous && $scope.selected.dataSet.ous[ou.id]){
                    $scope.validOus.push(ou);
                }            
            });
            
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
            });
        }         
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
     
    $scope.cancelMapping = function(){
        $route.reload();
    };
    
    $scope.saveMapping = function(){
        
        var rows = [];        
        angular.forEach(($filter('filter')($scope.gridRowOptions, {assigned: true})), function(r){
            //rows.push({id: r.id, row: r.assignedRow});
            rows[r.assignedRow] = r.id;
        });
        
        var cols = [];        
        angular.forEach(($filter('filter')($scope.gridColumnOptions, {assigned: true})), function(c){
            //cols.push({id: c.id, col: c.assignedColumn});
            cols[c.assignedColumn] = c.id;
        });
        
        var excelMapping = {rows: rows,
                                cols: cols,
                                row: $scope.row.model,
                                dataSet: $scope.selected.dataSet.id,
                                ou: $scope.selectedOrgUnit.id
                            };
        console.log('value mapping:  ', excelMapping);
        console.log('DE meta-data mapping:  ', $scope.mappedDEs);
        console.log('OU meta-data mapping:  ', $scope.mappedOUs);
        
        /*ExcelMappingService.save('key-excelMapping-' + selections.ds.id + '-' + selections.ou.id + '-' + selections.row, excelMapping).then(function(){
            var dialogOptions = {
                headerText: 'success',
                bodyText: 'maping_saved'
            };

            DialogService.showDialog({}, dialogOptions);
        });*/
    };
    
    var getColumnsAndRows = function(){
        $scope.excelColumns = [];
                
        for(var i=0; i<$scope.sheets[$scope.selectedSheetName]["col_size"]; i++){
            $scope.excelColumns.push({name: "", id: "", type: "", index: i, value: "", show: true, headerName: i, field: i});
        }

        var r = 0;
        angular.forEach($scope.sheets[$scope.selectedSheetName]["data"], function(col){                                
            for(var i=0; i<col.length; i++){
                col[i] = {assigned: false, isValid: true, value: col[i], r: r, c: i };
            }
            r++;
        });

        if($scope.row.model === 'DE'){
            $scope.gridRowOptions = $scope.selectedDataElements;
            $scope.gridColumnOptions = $scope.validOus;
        }
        else{
            $scope.gridRowOptions = $scope.validOus;
            $scope.gridColumnOptions = $scope.selectedDataElements;
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
        
        var mappingKey = $scope.sheets[$scope.selectedSheetName]["data"][$scope.startCoordinate.column][columnIndex].value;        
        
        $scope.resetAssignedColumn(columnIndex, mappingKey);
        
        if(column.value && mappingKey){
            if(column.value.id && columnIndex !== -1){
                for(var i=0; i<$scope.gridColumnOptions.length; i++){
                    if($scope.gridColumnOptions[i].id === column.value.id ){
                        $scope.gridColumnOptions[i].assigned = true;
                        $scope.gridColumnOptions[i].assignedColumn = columnIndex;
                        $scope.gridColumnOptions[i].cellName = mappingKey;
                        $scope.validateColumnAgainstModel($scope.gridColumnOptions[i], columnIndex);
                        
                        if($scope.row.model === 'DE'){
                            $scope.mappedOUs['"' + mappingKey + '"'] = $scope.gridColumnOptions[i].id;
                        }
                        else{
                            $scope.mappedDEs['"' + mappingKey + '"'] = $scope.gridColumnOptions[i].id;
                        }
                        
                        break;
                    }
                }
            }
        }
    };
    
    $scope.assignRowToModel = function(row, rowIndex){

        var mappingKey = $scope.sheets[$scope.selectedSheetName]["data"][rowIndex][$scope.startCoordinate.row].value;
        
        $scope.resetAssignedRow(rowIndex, mappingKey);
        
        if(row.value && mappingKey){
            if(row.value.id && rowIndex !== -1){                
                for(var i=0; i<$scope.gridRowOptions.length; i++){
                    if($scope.gridRowOptions[i].id === row.value.id && mappingKey){
                        $scope.gridRowOptions[i].assigned = true;
                        $scope.gridRowOptions[i].assignedRow = rowIndex;
                        $scope.gridRowOptions[i].cellName = mappingKey;
                        $scope.validateRowAgainstModel($scope.gridRowOptions[i], rowIndex);
                        
                        if($scope.row.model === 'DE'){
                            $scope.mappedDEs['"' + mappingKey + '"'] = $scope.gridRowOptions[i].id;
                        }
                        else{
                            $scope.mappedOUs['"' + mappingKey + '"'] = $scope.gridRowOptions[i].id;
                        }
                        
                        break;
                    }
                }
            }
        }
    };
    
    $scope.resetAssignedColumn = function(columnIndex, key){
        if( key ){
            key = '"' + key + '"';
            if($scope.row.model === 'DE'){
                delete $scope.mappedOUs['"' + key + '"'];
            }
            else{
                delete $scope.mappedDEs['"' + key + '"'];
            }
        }
        
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
    
    $scope.resetAssignedRow = function(rowIndex, key){
        if( key ){
            key = '"' + key + '"';
            if($scope.row.model === 'DE'){
                delete $scope.mappedDEs['"' + key + '"'];
            }
            else{
                delete $scope.mappedOUs['"' + key + '"'];
            }
        }
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
});