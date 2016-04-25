/**
 * Created by Mirihella on 4/12/2016.
 */

excelUpload.controller('EditTemplateController',
    function($rootScope,
             $scope,
             $modalInstance,
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
             DialogService,
             selectedTemp) {

        $scope.templates = {};
        $scope.tempMetaDataPage = true;
        $scope.tempDEMappingPage = false;
        $scope.selectedTemp = selectedTemp;
        $scope.selectedDSWithCOC = {};
        $scope.availableOptions = [{id:-1, name:"--select--"}];

        $scope.model = {newCellAddress:"",newDEwithCOC:-1};


        ExcelMappingService.get('Excel-import-app-templates').then(function(tem){
            if(!jQuery.isEmptyObject(tem))
                $scope.templates = tem;

            else
                $scope.templates = { templates : [] };

            ExcelMappingService.get('Excel-import-app-pool').then(function(pool){
                if(!jQuery.isEmptyObject(pool))
                    $scope.commonPool = pool;
                else
                    $scope.commonPool = { pool : [] };

                $.get('../api/dataSets.json?paging=false', function(ds){
                    console.log( ds );
                    $scope.dataSets = ds.dataSets;

                    //$scope.getDataSetInfo();
                    //$scope.generateEnglishAddresses();
                })
                .fail(function(jqXHR, textStatus, errorThrown){
                    alert("Failed to fetch data sets ( " + errorThrown + " )");
                });
            });
        });

        $scope.getSelectedDSWithCOC = function(){
            var url = "../api/dataSets/"+ $scope.selectedTemp.dataSet +".json?fields=id,organisationUnits[id],dataElements[id,name,shortName,categoryCombo[categoryOptionCombos[id,name]]]&paging=false";
            $.get(url , function(ds){
                $scope.selectedDSWithCOC = ds;

                var s = $scope.selectedDSWithCOC.dataElements.length;

                for( var x = 0; x < s ; x++ )
                {
                    for( var y =0 ; y < s - 1 ; y++ )
                    {
                        var t = {};
                        if( $scope.selectedDSWithCOC.dataElements[y].name > $scope.selectedDSWithCOC.dataElements[y+1].name)
                        {
                            t = $scope.selectedDSWithCOC.dataElements[y];
                            $scope.selectedDSWithCOC.dataElements[y] = $scope.selectedDSWithCOC.dataElements[y+1] ;
                            $scope.selectedDSWithCOC.dataElements[y+1] = t;
                        }
                    }
                }

                $scope.selectedDSWithCOC.dataElements.forEach(function(de){
                    de.categoryCombo.categoryOptionCombos.forEach(function(coc){
                        $scope.availableOptions.push({id:de.id + "-" + coc.id, name:de.name + " - " + coc.name});
                    });
                });
                console.log("34433");
                console.log($scope.availableOptions);


            })
                .fail(function(jqXHR, textStatus, errorThrown){
                    //$("#templateProgress").html("Failed to load selected dataset info ( " + errorThrown + " )");
                    alert("Failed to load selected dataset info ( " + errorThrown + " )");
                });
        };

        $scope.getSelectedDSWithCOC();

        $scope.showTempMetaDataPage = function () {
            $scope.tempMetaDataPage = true;
            $scope.tempDEMappingPage = false;
        };

        $scope.showTempDEMappingPage = function () {
            $scope.tempMetaDataPage = false;
            $scope.tempDEMappingPage = true;
        };

        $scope.addNewMapping = function(){
            switch($scope.selectedTemp.typeId) {
                case "1":
                    $scope.selectedTemp.DEMappings.push({rowNumber:$scope.model.mappingID,label:'modified',metadata:$scope.model.newDEwithCOC});
                    break;
                case "2":
                    $scope.selectedTemp.DEMappings.push({cellAddress:$scope.model.mappingID,label:'modified',metadata:$scope.model.newDEwithCOC});
                    break;
            }
        };

        /* this function close modal instance, actual save function is written in template-controller - showEditTemp() */
        $scope.saveTemp = function () {
            //DEMappings array is sorted by cell address
            $scope.selectedTemp.DEMappings = $filter('orderBy')($scope.selectedTemp.DEMappings, "rowNumber || cellAddress");
            console.log("$$$$");
            console.log($scope.selectedTemp);
/*
            // find the index of the selected Template in Templates and replace
            $scope.templates.templates.forEach(function(temp,index){
                if(temp.id ==  $scope.selectedTemp.id)
                {
                    $scope.templates.templates[index] = $scope.selectedTemp;
                }
            });

            ExcelMappingService.save('Excel-import-app-templates',$scope.templates ).then(function(response){
                console.log(response);
                if(response.status!="OK"){
                    alert(response.message+ " -- please see console for more info.")
                    console.log(response);
                    return;
                }
                //$modalInstance.close();
                location.reload();
            });
*/
            $modalInstance.close();
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
    });
