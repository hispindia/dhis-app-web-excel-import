/* global excelUpload, angular */

//Controller for excel importing
excelUpload.controller('ImportFacilitywiseController',
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

			$scope.orgUnitGroups = {};
			$scope.dataSets = {};
			$scope.templates = {};
// orgUnitMapping is not used for new requirement			$scope.orgUnitMapping = {};
			$scope.history = {};

			//data cells - this was put inside validateAll()
// $scope.dataCells = [];

			$scope.engAddress = ["","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

			$scope.confirmedUploads = [];

			/* **************************************************************************************
			 **** RETRIEVING ROOT JSON AND NEEDED DATA ***********************************************
			 ************************************************************************************* **/

			//templates
			$("#templateProgress").html("Retrieving all the saved templates...");
			ExcelMappingService.get('Excel-import-app-templates').then(function(tem){
				if(!jQuery.isEmptyObject(tem))
					$scope.templates = tem;
				else
					$scope.templates = { templates : [] };

				console.log( $scope.templates );

				//templates
				$("#templateProgress").html("Retrieving all the organisation units mapping data...");
				ExcelMappingService.get('Excel-import-app-orgunit-mapping').then(function(oum){

/* orgUnitMapping is not used for new requirement
if(!jQuery.isEmptyObject(oum))
$scope.orgUnitMapping = oum;
else
$scope.orgUnitMapping = { omaping : [] };

console.log( $scope.orgUnitMapping );
*/

					//history
					$("#templateProgress").html("Retrieving all the import history...");
					ExcelMappingService.get('Excel-import-app-history').then(function(his){
						$scope.history = jQuery.isEmptyObject( his ) ? JSON.parse('{"history" : []}') : his;
						console.log( his );

						//org unit group
						$("#templateProgress").html("Fetching organisation unit groups...");
						$.get('../api/organisationUnitGroups.json?paging=false', function(ou){
							console.log( ou );
							$scope.orgUnitGroups = ou.organisationUnitGroups;

							//datasets
							$("#templateProgress").html("Fetching all the data sets...");
							$.get('../api/dataSets.json?paging=false', function(ds){
								console.log( ds );
								$scope.dataSets = ds.dataSets;

								//dataelements
								$("#templateProgress").html("Fetching all the data elements...");
								$.get('../api/dataElements.json?fields=id,name,shortName,categoryCombo[categoryOptionCombos[id,name]]&paging=false', function(ds){
									console.log( ds );
									$scope.dataElements = ds.dataElements;
/* is service is not used for new requirement, orgUnits are load using orgUnitTree
									//orgunits
									$("#templateProgress").html("Fetching all the organisation units...");
									$.get('../api/organisationUnits.json?paging=false', function(ds){
										console.log( ds );
										$scope.organisationUnits = ds.organisationUnits;



									}).
											fail(function(jqXHR, textStatus, errorThrown){
												$("#templateProgress").html("Failed to fetch organisation units ( " + errorThrown + " )");
											});
*/

									$scope.generateEnglishAddresses();
									$scope.startBuilding();
									$("#loader").hide();

								}).
										fail(function(jqXHR, textStatus, errorThrown){
											$("#templateProgress").html("Failed to fetch data elements ( " + errorThrown + " )");
										});
							}).
									fail(function(jqXHR, textStatus, errorThrown){
										$("#templateProgress").html("Failed to fetch data sets ( " + errorThrown + " )");
									});

						}).
								fail(function(jqXHR, textStatus, errorThrown){
									$("#templateProgress").html("Failed to fetch organisation unit groups ( " + errorThrown + " )");
								});
					});
				});
			});
			//**************************************************************************************************************

			//building UIs
			$scope.startBuilding = function(){
				$("#templateProgress").html("Making things ready...");
				$.each( $scope.dataSets , function( i, d ){
					$("#imDataSetId").append("<option value='"+ d.id +"' > " + d.name +" </option>");
				});

				$.each( $scope.orgUnitGroups , function( i, o ){
					$("#imOrgUnitGrp").append("<option value='"+ o.id +"' > " + o.name +" </option>");
				});
			};

			//**************************************************************************************************************

			$scope.generatePeriods = function(){

				if( $("#imDataSetId").val() != "" )
				{
					var url = "../api/dataSets/" + $("#imDataSetId").val() + ".json?fields=periodType";
					$.get(url, function(d){

						//printing periods ------------------
						var periodType = d.periodType;
						var today = new Date();
						//var stDate = "01/01/" + today.getFullYear();
						var stDate = "01/01/" + "2014";
						var endDate = "01/01/" + (today.getFullYear()+1);

						var periods = "";

						if(periodType == "Daily")
							periods = daily( stDate , endDate );
						else if(periodType == "Weekly")
							periods = weekly( stDate , endDate );
						else if(periodType == "Monthly")
							periods = monthly( stDate , endDate );
						else if(periodType == "Yearly")
							periods = yearly( stDate , endDate );
						else if(periodType == "Quarterly")
							periods = quartly( stDate , endDate );

						$("#importPeriod").html("");
						periods.split(";").forEach(function(p){
							var ps = periodType == 'Monthly' ? $scope.monthString(p) : p;
							var h = "<option value='"+ p +"'>" + ps + "</option>";
							$("#importPeriod").append(h);
						});

						//prining templates ---------------------
						var noTemplatesFound = true;
						$('#importTemp').html("");
						$scope.templates.templates.forEach(function(te){
							if( te.dataSet == $("#imDataSetId").val() && ( te.orgUnitGroup == $("#imOrgUnitGrp").val() || $("#imOrgUnitGrp").val() == "all" ) )
							{
								noTemplatesFound = false;
								$('#importTemp').append($('<option>', {
									value: te.id,
									text: te.name
								}));
							}
						});

						if( noTemplatesFound )
						{
							$('#importTemp').append($('<option>', {
								value: -1,
								text: "No templates found. Add one."
							}));

							$("#templatesDiv").removeClass("disabled");
							$("#templatesDiv").addClass("disabled");
						}
						else
						{
							$("#templatesDiv").removeClass("disabled");
						}
					});

				}
			};

/*
			$scope.setFacilities = function(){

				console.log("orgUnitGroup id : " + $("#imOrgUnitGrp").val());
				if( $("#imOrgUnitGrp").val() != "" ){
					var url = "../api/organisationUnitGroups/" + $("#imOrgUnitGrp").val() + ".json";
					console.log("url : " + url);
					$.get(url, function(oug){
						var imOrgUnitHTML = "";
						$.each( oug.organisationUnits , function( i, ou ){
							imOrgUnitHTML = imOrgUnitHTML + "<option value='"+ ou.id +"' > " + ou.name +" </option>";
						});
						$("#imOrgUnit").html("");
						$("#imOrgUnit").append(imOrgUnitHTML);
					});

				}
			};
*/
			$scope.filterOrgUnits = function(){

				var orgUnitGroupID = $("#imOrgUnitGrp").val();
				var parentUnitID = $scope.selectedOrgUnit.id;

					var url = "../api/organisationUnits.json?paging=false&fields=id,name&filter=parent.id:eq:"+parentUnitID+"&filter=organisationUnitGroups.id:eq:"+orgUnitGroupID+"";
					$.get(url, function(ous){

						if(ous.organisationUnits.length) {
							var htmlString = '<tr><td colspan="2" align="center"> Browse Files</td></tr>';
							$.each(ous.organisationUnits, function( i, ou ) {
								//var importID = "orgUnit-"+i+"-file" ;
								var importID = ou.id;
								htmlString += '<tr> <td>' + ou.name + '</td> <td align="right"><input class="" style="width:75px;font-size:12px" id="' + ou.id + '" type="file" accept=".xls,.xlsx"/></td> </tr>';
							});

//						console.log("String : " + htmlString);
							$("#confirmedUploadsContent").html(htmlString);
							$("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;max-height:500px;overflow-y:auto;padding:30px 10px 30px 10px");


							$.each(ous.organisationUnits, function( i, ou ) {
								//console.log("doneee");
								var elementID = ou.id;
								//console.log("elementID : " + elementID);
								var fileID = document.getElementById(elementID);
								fileID.addEventListener('change', function( e ) {
									handleInputFile(e, ou);
								}, false);
							});
						} else{
							var htmlString = '<tr><td colspan="2" align="center"> No OrgUnits found</td></tr>';
							$("#confirmedUploadsContent").html(htmlString);
						}
						$("#confirmedUploadsDiv").attr("style", "width:300px;display:inline-block;float:right;height:540px;overflow-y:auto;padding:30px 10px 30px 10px");
						$("#confirmedUploadsDiv").removeClass("disabled");
						$("#form1").addClass("disabled");
						$("#templatesContentDiv").addClass("disabled");
						$("#nextBtn").hide();
						$("#imb").show();
						$("#cancelBtn").removeClass("disabled");
						$("#loader").fadeOut();
					});
			};

			$scope.monthString = function(pst){
				var month = pst.substring(4, 6);
				var ms = "";

				if( month == "01" )
					ms = "Jan";
				else if( month == "02" )
					ms = "Feb";
				else if( month == "03" )
					ms = "Mar";
				else if( month == "04" )
					ms = "Apr";
				else if( month == "05" )
					ms = "May";
				else if( month == "06" )
					ms = "Jun";
				else if( month == "07" )
					ms = "Jul";
				else if( month == "08" )
					ms = "Aug";
				else if( month == "09" )
					ms = "Sep";
				else if( month == "10" )
					ms = "Oct";
				else if( month == "11" )
					ms = "Nov";
				else if( month == "12" )
					ms = "Dec";

				return ms + " " + pst.substring(0, 4);
			};

			//*****************************************************************************************

			// VALIDATIONS
			$scope.validatedMessage = [];
			$scope.isEverythingOK = true;

			$scope.validateAll = function(orgUnit, index){
				var dataCells = [];
//				$scope.validatedMessage.length = 0;
//				$("#loader").fadeIn();
//$("#templateProgress").html("Getting data from data sheet");
				$("#templateProgress").html("Validating sheet : " + orgUnit.name);

				if(orgUnit.result){
					// extract all cell addresses and it's values
					/* *** */				orgUnit.result.forEach(function(r){
//console.log("r is : " + r);
						var cell ={};
						cell.address = r.split("=")[0];

						if( r.split("=").length > 1 )
							cell.value = r.split("=")[1].slice(1).trim(); //There is an additional char in the value

						dataCells.push(cell);
//confirmedUploads[item].dataCells = dataCells;
						orgUnit.dataCells = dataCells;
						$scope.confirmedUploads.orgUnits[index] = orgUnit;
					});
				} else{
					$scope.isEverythingOK = false;
					$scope.validatedMessage.push("Something wrong with "+orgUnit.name+" excel sheet.");
				}




/* *** */				var selectedTemp = $scope.getTemplate( $scope.confirmedUploads.TempVal );

				if( selectedTemp != "" )
				{

					$.each( selectedTemp.DEMappings, function( i , dem ){

						$("#templateProgress").html(orgUnit.name + " -> orgValidating data elements mapping - " + (i+1) + " of " + selectedTemp.DEMappings.length );

						if( !$scope.isDEAvailable( dem.metadata ) )
							$scope.isEverythingOK = false;
					});

/* orgUnitMapping is not used in new requirement
					$("#templateProgress").html("Validating organisation unit labels");


					if( selectedTemp.typeId == 1 ) //MOU - MDE
					{
						if( selectedTemp.columnMetaData == "o" )
						{
							for( var y = selectedTemp.columnStart.cn; y <= selectedTemp.columnEnd.cn ; y++ )
							{
								$scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.columnStart.rn , y ) );
							}
						}
						else
						{
							for( var x = selectedTemp.rowStart.rn; x <= selectedTemp.rowStart.rn ; x++ )
							{
								$scope.isOrgUnitAvailable( $scope.getImportData( x , selectedTemp.rowStart.cn ) );
							}
						}
					}
					else if ( selectedTemp.typeId == 2 ) //SOU - MDE
					{
						//if( selectedTemp.columnMetaData == "o" )
						console.log(selectedTemp.orgUnitCell.rn + " " +  selectedTemp.orgUnitCell.cn );
//$scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.orgUnitCell.rn , selectedTemp.orgUnitCell.cn ) );
						//else
						//$scope.isOrgUnitAvailable( $scope.getImportData( selectedTemp.rowStart.rn , selectedTemp.rowStart.cn ) );
					}
*/
				}

//				$("#loader").fadeOut();

			};

			$scope.viewConflicts = function(){
				var htmlString = "";

				htmlString += "<ol>";

				$.each( $scope.validatedMessage , function(i, m){
					htmlString += "<li>" + m + "</li>";
				});

				htmlString += "</ol>";

				$("#confBdy").html( htmlString );
				$("#conflictModal").modal('show');
			};

			// to check if a data element is available while validating
			$scope.isDEAvailable = function(de){
				var deId = de.split("-")[0];
				var coc = de.split("-").length > 1 ? de.split("-")[1] : "";

				var isDeFound = false;
				var isCocFound = false;

				$.each( $scope.dataElements , function(i, d){
					if( d.id == deId )
					{
						isDeFound = true;

						$.each( d.categoryCombo.categoryOptionCombos, function( i , c){
							if( c.id == coc ){
								isCocFound = true;
								return false;
							}
						});
						return false;
					}
				});
console.log(" de : "+isDeFound+" coc : "+isCocFound);

				if( !isDeFound ){
					$scope.validatedMessage.push("Data element " + deId + " is not found");
					return false;
				} else{
					if( !isCocFound ){
						$scope.validatedMessage.push( "COC " + coc + " of data element " + deId + " is not found" );
						return false;
					} else
						return true;
				}
			};

/* this function is not used for new requirement
			// to check if an orgunit is available while validating
			$scope.isOrgUnitAvailable = function( label ){
				var isFound = false;
				var ou = "";

				$.each( $scope.orgUnitMapping.omapping , function( i , oum){
					if( oum.label == label )
						ou = oum.orgUnit;
				});

				if( ou == "" )
					$scope.validatedMessage.push("No mappings found for organisation unit label " + label ) ;

				$.each( $scope.organisationUnits , function(i , o){
					if( o.id == ou )
						isFound = true;
				});

				if( !isFound && ou != "" )
					$scope.validatedMessage.push("Organisation Unit with id " + ou + " is not found");

				if( !isFound || ou == "" )
				{
					$scope.isEverythingOK = false;
					return false;
				}
				else
				{
					return true;
				}
			};
*/

			//****************************************************************************************************************
			//****************************************************************************************************************
			// IMPORT FUNCTION
			//****************************************************************************************************************
			//****************************************************************************************************************

			$scope.h = {};
			$scope.importData = function(orgUnit,index,callbackfunct){
				var selectedTemp = $scope.getTemplate( $scope.confirmedUploads.TempVal );
				var dataValues = [];
//				$("#loader").fadeIn();
				$("#templateProgress").html(orgUnit.name + " -> preparing data values to import");

//				if( selectedTemp != "" )
//				{

/* MOU - MDE is not used in new requirement
						// MOU - MDE
					if( selectedTemp.typeId == 1 )
					{
console.log("yes it is mou - mde");
						if( selectedTemp.columnMetaData == "o" )
						{
							for( var x = 0 ; x < selectedTemp.DEMappings.length ; x++ )
							{
								var rowNum = selectedTemp.DEMappings[x].rowNumber;

								for( var y = selectedTemp.columnStart.cn ; y <= selectedTemp.columnEnd.cn ; y++ )
								{
									var dataValue = {};
									dataValue.period = $("#importPeriod").val();
									dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
									dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
									var ouLabel = $scope.getImportData( selectedTemp.columnStart.rn , y );
									dataValue.orgUnit = $scope.getOrgUnitByLabel( ouLabel );
									dataValue.value = $scope.getImportData( rowNum, y );

									if( $("#importEmpty").val() == 2 )
										dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
									else
										dataValue.value = dataValue.value == "" ? 0 : dataValue.value;


									if( dataValue.orgUnit != "" && dataValue.value != "omit" )
									{
										dataValues.push(dataValue);
									}

								}
							}
						}
						else
						{
							for( var x = 0 ; x < selectedTemp.DEMappings.length ; x++ )
							{
								var colNum = selectedTemp.DEMappings[x].colNumber;

								for( var y = selectedTemp.rowStart.rn ; y <= selectedTemp.rowEnd.rn ; y++ )
								{
									var dataValue = {};
									dataValue.period = $("#importPeriod").val();
									dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
									dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
									var ouLabel = $scope.getImportData( y, selectedTemp.rowStart.cn );
									dataValue.orgUnit = $scope.getOrgUnitByLabel( ouLabel );
									dataValue.value = $scope.getImportData( y, colNum );

									if( $("#importEmpty").val() == 1 )
										dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
									else
										dataValue.value = dataValue.value == "" ? 0 : dataValue.value;


									if( dataValue.orgUnit != "" && dataValue.value != "omit" )
										dataValues.push(dataValue);
								}
							}
						}
					}
*/
					// SOU - MDE
					if( selectedTemp.typeId == 2 )
					{
						//if( selectedTemp.columnMetaData == "o" )
						//{
						for( var x = 0 ; x < selectedTemp.DEMappings.length ; x++ )
						{
							var cellAddress = selectedTemp.DEMappings[x].cellAddress;

							var dataValue = {};
/* *** */							dataValue.period = $scope.confirmedUploads.periodVal;
							dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
							dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
/* org unit will be taken from input box
var ouLabel = $scope.getImportData( selectedTemp.orgUnitCell.rn , selectedTemp.orgUnitCell.cn );
dataValue.orgUnit = $scope.getOrgUnitByLabel( ouLabel );
*/
/* *** */							dataValue.orgUnit = orgUnit.id;

							dataValue.value = $scope.getImportDataByAddress( cellAddress, orgUnit );

/* *** */							if( $scope.confirmedUploads.importEmptyVal == 2 )
								dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
							else
								dataValue.value = dataValue.value == "" ? 0 : dataValue.value;


							if( dataValue.orgUnit != "" && dataValue.value != "omit" )
							{
								dataValues.push(dataValue);
							}
						}
						//}
						/*else
						 {
						 for( var x = 0 ; x < selectedTemp.DEMappings.length ; x++ )
						 {
						 var colNum = selectedTemp.DEMappings[x].colNumber;

						 for( var y = selectedTemp.rowStart.rn ; y <= selectedTemp.rowEnd.rn ; y++ )
						 {
						 var dataValue = {};
						 dataValue.period = $("#importPeriod").val();
						 dataValue.dataElement = selectedTemp.DEMappings[x].metadata.split("-")[0];
						 dataValue.categoryOptionCombo = selectedTemp.DEMappings[x].metadata.split("-")[1];
						 var ouLabel = $scope.getImportData( selectedTemp.rowStart.rn, selectedTemp.rowStart.cn );
						 dataValue.orgUnit = $scope.getOrgUnitByLabel( ouLabel );
						 dataValue.value = $scope.getImportData( y, colNum );

						 if( $("#importEmpty").val() == 1 )
						 dataValue.value = dataValue.value == "" ? "omit" : dataValue.value;
						 else
						 dataValue.value = dataValue.value == "" ? 0 : dataValue.value;


						 if( dataValue.orgUnit != "" && dataValue.value != "omit" )
						 dataValues.push(dataValue);
						 }
						 }
						 }*/
					}

					console.log( "dataValues : " + JSON.stringify(dataValues) );
//				}

/*	couldn't find any use of this
				$.each( dataValues , function(i,v){

				});
*/

				$("#templateProgress").html(orgUnit.name + " -> Importing data.. Please wait.. This may take several minutes..");

				//console.log( dataValues );
				var dataValueSet = {};
				dataValueSet.dataValues = dataValues;


				//making ready to import data
				$.get("../api/system/info", function(data){
					//adding history
//					var h = {};

					$scope.h.time = data.serverDate.split("T")[0] + " (" + data.serverDate.split("T")[1].split(".")[0] + ")";
//					$scope.h.orgUnitGroup = $scope.confirmedUploads.orgUnitGrpName;
					$scope.h.orgUnits[index] = orgUnit.name;
//					$scope.h.dataSet = $scope.confirmedUploads.dataSetName;
//					$scope.h.period = $scope.confirmedUploads.periodName;
//					$scope.h.template = $scope.confirmedUploads.TempName;

					if( $scope.validatedMessage.length == 0 && $scope.isEverythingOK )
						$scope.validatedMessage.push("Everything was perfect as per validations");

					$scope.h.orgUnits[index] = $scope.validatedMessage;
//					$scope.h.stats = {};
//					$scope.h.stats.upc = 0;
//					$scope.h.stats.imc = 0;
//					$scope.h.stats.igc = 0;
					$scope.h.orgUnits[index].stats = {};

					//saving data
					ExcelMappingService.importData( dataValueSet ).then(function(tem){
//						$("#loader").hide();
						console.log("index : "+index);
						console.log("no of orgUnits : "+$scope.confirmedUploads.orgUnits.length);
						console.log(tem.data.importCount.updated);
						console.log(tem.data.importCount.imported);
						console.log(tem.data.importCount.ignored);

						$scope.h.stats.upc += tem.data.importCount.updated;
						$scope.h.orgUnits[index].stats.upc = tem.data.importCount.updated;
						$scope.h.stats.imc += tem.data.importCount.imported;
						$scope.h.orgUnits[index].stats.imc = tem.data.importCount.imported;
						$scope.h.stats.igc += tem.data.importCount.ignored;
						$scope.h.orgUnits[index].stats.igc = tem.data.importCount.ignored;
						$scope.history.history.push($scope.h);
						$scope.storeHistory();

						console.log("org upc : "+$scope.h.orgUnits[index].stats.upc);
						console.log("org imc : "+$scope.h.orgUnits[index].stats.imc);
						console.log("org igc : "+$scope.h.orgUnits[index].stats.igc);
						console.log("upc stat : " + $scope.h.stats.upc);
						console.log("imc stat : " +$scope.h.stats.imc);
						console.log("igc stat : " +$scope.h.stats.igc);

//						$("#upc").html(tem.data.importCount.updated);
//						$("#imct").html(tem.data.importCount.imported);
//						$("#igc").html(tem.data.importCount.ignored);
//						$("#stModal").modal('show');
						if($scope.confirmedUploads.orgUnits.length==(index+1)){
							callbackfunct();
						}
					});
				});
			};

			//****************************************************************************************************************
			//****************************************************************************************************************
			//****************************************************************************************************************
			//****************************************************************************************************************

			$scope.getTemplate = function(id){
				var t = "";

				$scope.templates.templates.forEach(function(te){
					if( te.id == id )
						t = te;
				});

				return t;
			};

			$scope.getImportData = function( rowNum, colNum ){
				var address = $scope.engAddress[colNum]+""+rowNum;
				var val = "";

/* removed this part since it is not used in SOU - MDE in importData()
				$scope.dataCells.forEach(function(c){
					if( c.address == address )
						val = c.value;
				});
*/

				return(val);
			};

			$scope.getImportDataByAddress = function( add, orgUnit ){
				var address = add;
				var val = "";

				orgUnit.dataCells.forEach(function(c){
					if( c.address == address )
						val = c.value;
				});
console.log("value : " + val);
				return(val);
			};

			$scope.generateEnglishAddresses = function(){
				//generating more address notations for columns
				for( var x = 1 ; x < 27 ; x++ )
				{
					for( var y = 1 ; y < 27 ; y++ )
					{
						$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]);
					}
				}

				for( var x = 1 ; x < 27 ; x++ )
				{
					for( var y = 1 ; y < 27 ; y++ )
					{
						for( var z = 1; z < 27 ; z++ )
						{
							$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]+ "" + $scope.engAddress[z]);
						}
					}
				}

				for( var x = 1 ; x < 27 ; x++ )
				{
					for( var y = 1 ; y < 27 ; y++ )
					{
						for( var z = 1; z < 27 ; z++ )
						{
							for( var u = 1; u < 27 ; u++ )
							{
								$scope.engAddress.push($scope.engAddress[x] + "" + $scope.engAddress[y]+ "" + $scope.engAddress[z]+ "" + $scope.engAddress[u]);
							}
						}
					}
				}
			};

/* this function is not used for new requirement
			$scope.getOrgUnitByLabel = function( label ){
				var ou = "";
				$.each( $scope.orgUnitMapping.omapping , function( i , oum){
					if( oum.label == label )
						ou = oum.orgUnit;
				});
				return ou;
			};
*/

			$scope.storeHistory = function(){
				ExcelMappingService.save('Excel-import-app-history',$scope.history ).then(function(r){
					//console.log(r);
				});
			};

			$scope.validateUploads = function(){
				$("#loader").fadeIn();
				$scope.validatedMessage.length = 0;
				$scope.isEverythingOK = true;

				$scope.confirmedUploads.orgUnits.forEach(function(orgUnit,index){
					$scope.validateAll(orgUnit,index);
				});

				if($scope.isEverythingOK){
					$("#ime").show();
				} else{
					$("#imd").show();
					$scope.viewConflicts();
				}

				$("#confirmedUploadsDiv").addClass("disabled");
				$("#imb").hide();
				$("#loader").fadeOut();
			};

			$scope.importUploads = function(){
				$("#loader").fadeIn();

				$scope.h.orgUnitGroup = $scope.confirmedUploads.orgUnitGrpName;
				$scope.h.dataSet = $scope.confirmedUploads.dataSetName;
				$scope.h.period = $scope.confirmedUploads.periodName;
				$scope.h.template = $scope.confirmedUploads.TempName;
				$scope.h.orgUnits = [];
				$scope.h.stats = {};
				$scope.h.stats.upc = 0;
				$scope.h.stats.imc = 0;
				$scope.h.stats.igc = 0;

				var callbackfunct = function(){
					$("#upc").html($scope.h.stats.upc);
					$("#imct").html($scope.h.stats.imc);
					$("#igc").html($scope.h.stats.igc);
					$("#stModal").modal('show');

					$("#loader").fadeOut();

				};

				$scope.confirmedUploads.orgUnits.forEach(function(orgUnit,index){
					$scope.importData(orgUnit,index,callbackfunct);
				});

			};
		});