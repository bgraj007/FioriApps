sap.ui.define([
	"BillManagerWorklist/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"BillManagerWorklist/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/routing/History",
	'sap/m/MessageBox',
	'sap/m/Button',
	'sap/m/Dialog',
	"sap/ui/model/odata/OperationMode"
], function(BaseController, JSONModel, formatter, Filter, FilterOperator, History, MessageBox, Button, Dialog, OperationMode) {
	"use strict";

	return BaseController.extend("BillManagerWorklist.controller.Worklist", {
		formatter: formatter,
		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			this._oTable = oTable;
			// keeps the search state
			this._oTableSearchState = [];
			var f4Model = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPRS_DB_WF01_SRV"); //ZPRS_VALUE_HELP_SRV
			this.getView().setModel(f4Model, "F4Model");
			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("worklistViewTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistViewTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0,
				saveButton: false,
				saveFA: false,
				saveFE: false,
				saveASTE: false,
				saveApr: false,
				cancelDB: false,
				Comments: "",
				NewComments: "",
				billNum: ""
			});
			this.setModel(oViewModel, "worklistView");
			this.setModel(new JSONModel({
				Boffice: ""
			}), "searchModel");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			/*
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			}); */

			this.oBusyIndicator = this.getTable().getNoData();
			this.initBindingEventHandler();
		},
		onExit: function() {
			this.oBusyIndicator.destroy();
			this.oBusyIndicator = null;
		},
		getTable: function() {
			return this.getView().byId("table");
		},
		onModelRefresh: function() {
			this.getDtFrmSrv([]);
		},
		onModelRefresh_old: function() {
			this.getTable().getBinding().refresh(true);
			this.getTable().getBinding("rows").filter([], "Application");
		},
		getDtFrmSrv: function(filters) {
			var oComponent = this.getOwnerComponent();
			var oModel = oComponent.getModel();
			var that = this;
			var oPath = "/WorklistBillManagerSet";
			var oTable = this.getTable();
			var mParameters = {
				filters: filters,
				success: function(data) {
					oTable.setNoData(null);
					var clientModel = new sap.ui.model.json.JSONModel();
					clientModel.setData({
						clientModel: data.results
					});
					oTable.setModel(clientModel);
					oTable.bindRows("/clientModel");
					oTable.setBusy(false);
					var oBinding = oTable.getBinding("rows");
					that.setTableHearderCount();
					oBinding.attachChange(function() {
						that.setTableHearderCount();
					}.bind(that));
				},
				error: this.readError
			};
			oTable.setNoData(this.oBusyIndicator);
			oModel.read(oPath, mParameters);
		},
		readError: function(oError) {

		},
		initBindingEventHandler: function() {
			this.getDtFrmSrv([]);
			/// comment Model 
			var comModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/zprs_bill_edit_srv/");
			this.setModel(comModel, "comModel");
		},
		initBindingEventHandler_old: function() {
			var oTable = this.getTable;
			var wlsetModle = this.getOwnerComponent().getModel();
			var that = this;
			wlsetModle.attachBatchRequestSent(function(evt) {
				oTable.setNoData(this.oBusyIndicator);
			});
			wlsetModle.attachBatchRequestCompleted(function(evt) {
				var oSource = evt.getSource();
				oSource.bClientOperation = true; //Set Client Operation to true 
				oSource.sOperationMode = "Client"; //Set operation mode to Client 
				oTable.setNoData(null);
				var oBinding = oTable.getBinding("rows");
				that.setTableHearderCount();
				oBinding.detachChange();
				oBinding.attachChange(function(oEvent) {
					that.setTableHearderCount();
				});
			});
			/// comment Model 
			var comModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/zprs_bill_edit_srv/");
			this.setModel(comModel, "comModel");
		},
		setTableHearderCount: function() {
			var oTable = this.getTable();
			var oBinding = oTable.getBinding("rows");
			var sTitle, iTotalItems = oBinding.getLength();
			if (iTotalItems && oTable.getBinding("rows").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},
		onUpdateFinished: function(oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("rows").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},
		onPress: function(oEvent) {
			var oSelItem = oEvent.getSource();
			var oContext = oSelItem.getBindingContext();
			var oObj = oContext.getObject(),
				billerUrl;

			switch (oObj.Role) {
				case "01":
					billerUrl = "/sap/bc/ui5_ui5/sap/ZPRS_BILL_EDIT/index.html#/main/" + oObj.Vbeln;
					sap.m.URLHelper.redirect(billerUrl, true);
					break;
				case "02":
				case "03":
				case "04":
				case "05":
					billerUrl = "/sap/bc/ui5_ui5/sap/ZPRS_WORK_FLOW/index.html#/main/" + oObj.Vbeln;
					sap.m.URLHelper.redirect(billerUrl, true);
					break;
			}
		},
		onNavBack: function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},
		onSearch: function(oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				this.onRefresh();
			} else {
				var oTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					oTableSearchState = [new Filter("Pspid", FilterOperator.Contains, sQuery), new Filter("Vbeln", FilterOperator.Contains, sQuery)];
					oTableSearchState = [new Filter(oTableSearchState, false)];
				}
				this._applySearch(oTableSearchState);
			}
		},

		onRefresh: function() {
			this._oTable.getBinding("rows").refresh();
		},

		_showObject: function(oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Vbeln")
			});
		},

		_applySearch: function(oTableSearchState) {
			var oViewModel = this.getModel("worklistView");
			this._oTable.getBinding("rows").filter(oTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (oTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},
		onRequestSent: function(oEvt) {
			this.getView().setBusy(true);
		},
		showQuickView: function(oEvt) {
			var src = oEvt.getSource();
			var caller = src.data().caller;
			var fragPath = "BillManagerWorklist.fragments.Comment";
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			worklistData.caller = caller;
			if (caller !== "multi") {
				var obj = src.getBindingContext().getObject();
				worklistData.NewComments = obj.NewComments;
			} else {
				worklistData.NewComments = "";
			}
			worklistModel.setData(worklistData);
			worklistModel.refresh();
			if (!this.oQuick) {
				this.oQuick = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this.oQuick);
			}
			this.oQuick.setBindingContext(src.getBindingContext());
			this.oQuick.openBy(oEvt.getSource());
		},
		disPlayComment: function(oEvt) {
			var src = oEvt.getSource();
			var fragPath = "BillManagerWorklist.fragments.DisplayComment";
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();

			var obj = src.getBindingContext().getObject();
			worklistData.Comments = obj.Comments;

			worklistModel.setData(worklistData);
			worklistModel.refresh();
			if (!this.displayCmt) {
				this.displayCmt = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this.displayCmt);
			}
			var comList = sap.ui.getCore().byId("commentsList");
			var binding = comList.getBinding("items");
			var filters = [];
			filters.push(new Filter("Area", FilterOperator.EQ, "W2"));
			filters.push(new Filter("Vbeln", FilterOperator.EQ, obj.Vbeln));
			binding.filter(filters);
			this.displayCmt.openBy(oEvt.getSource());
		},
		handlCommentClose: function(oEvt) {
			this.displayCmt.close();
		},
		handleCommentAdd: function(oEvent) {
			var tbl = this.getTable();
			var src = oEvent.getSource();
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			if (worklistData.caller === "multi") {
				$.each(tbl.getSelectedIndices(), function(i, o) {
					var oCtxt = tbl.getContextByIndex(o);
					var path = oCtxt.getPath() + "/NewComments";
					oCtxt.getModel().setProperty(path, worklistData.NewComments);
				});
			} else {
				var oCtxt = src.getBindingContext();
				var path = oCtxt.getPath() + "/NewComments";
				oCtxt.getModel().setProperty(path, worklistData.NewComments);
			}
			this.oQuick.close();
		},
		onItemSelect: function(oEvt) {
			var tbl = oEvt.getSource();
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			//	var rowContext = oEvt.getParameter("rowContext");
			var isUniqueMatter = true;
			//	var currentMatter = rowContext.getProperty("Pspid");
			var selInx = tbl.getSelectedIndices();
			$.each(selInx, function(i, o) {
				if (i + 1 < selInx.length) {
					var currIndx = selInx[i],
						nextIndx = selInx[i + 1],
						cCtx = tbl.getContextByIndex(currIndx),
						nCtx = tbl.getContextByIndex(nextIndx);
					if (cCtx.getProperty("Pspid") !== nCtx.getProperty("Pspid")) {
						isUniqueMatter = false;
					}
				}
			});
			if (!isUniqueMatter) {
				worklistModel.setProperty("/delToOthers", false);
				/*MessageBox.warning(
					this.getResourceBundle().getText("uniqueMatterWarning"));*/
				//selItem.setSelected(false);
			} else {
				worklistModel.setProperty("/delToOthers", true);
			}
			worklistModel.setData(worklistData);
			/* add fix later
			if (selItem) {
				var commentCell = selItem.getCells()[8];
				commentCell.getContent()[0].setEnabled(selItem.getSelected());
				commentCell.getContent()[1].setEnabled(selItem.getSelected());
			} */

		},
		getFirstWord: function(comment) {
			if (comment && comment !== "") {
				return comment.split(" ")[0];
			}
			return comment;
		},
		handleIconTabBarSelect: function(oEvent) {

		},
		handleMatterPress: function(oEvt) {
			var oLink = oEvt.getSource();
			var obj = oLink.getBindingContext().getObject();
			var matterData = {
				pages: [{
					pageId: "genericPageId",
					header: "Matter Detail",
					title: "Matter Detail",
					titleUrl: "",
					icon: "sap-icon://message-information",
					groups: [{
						elements: [{
							label: obj.Pspid,
							value: obj.Post1
						}, {
							label: obj.Kunnr,
							value: obj.Kunnrname
						}, {
							label: obj.Boffice,
							value: obj.Werksdesc
						}, {
							label: obj.Zzmcurr
						}]
					}]
				}]
			};
			var matterModel = new JSONModel();
			matterModel.setData(matterData);
			if (!this._oMatterQuickView) {
				var fragPath = "BillManagerWorklist.fragments.MatterQView";
				this._oMatterQuickView = sap.ui.xmlfragment(fragPath, this);
				this.getView().addDependent(this._oMatterQuickView);
			}
			this._oMatterQuickView.setModel(matterModel);
			this._oMatterQuickView.openBy(oLink);
		},
		handleSortPress: function(oEvt) {
			var tbl = this.getView().byId("table");
			var oBinding, aSort = [],
				sPath;
			sPath = oEvt.getSource().data().sortField;
			oBinding = tbl.getBinding("rows");
			var isDesc = false;
			if (oBinding.aSorters.length > 0) {
				isDesc = !oBinding.aSorters[0].bDescending;
			}
			aSort = new sap.ui.model.Sorter(sPath, isDesc);
			oBinding.sort(aSort);
		},
		messageRest: function(tbl) {
			$.each(tbl.getSelectedIndices(), function(i, o) {
				var ctx = tbl.getContextByIndex(o);
				var m = ctx.getModel(ctx.getPath());
				m.setProperty(ctx.getPath() + "/Error", "");
				m.setProperty(ctx.getPath() + "/Message", "");
				m.setProperty(ctx.getPath() + "/ToUser", "");
			});
			tbl.clearSelection();
		},
		clearSearchFields: function() {
			var searchModel = this.getView().getModel("searchModel");
			searchModel.setProperty("/WorkDateFrom", null);
			searchModel.setProperty("/WorkDateTo", null);
			searchModel.setProperty("/Boffice", "");
		},
		handleTableRefresh: function(oEvt) {
			var tbl = this.getTable();
			this.messageRest(tbl);
			this.clearSearchFields();
			this.onModelRefresh();
			// clear column filter values
			var aColumns = tbl.getColumns();
			for (var i = 0; i < aColumns.length; i++) {
				var isFiltered = aColumns[i].getFiltered();
				tbl.filter(aColumns[i], "");
				aColumns[i].setFiltered(isFiltered);
			}
			this.getView().byId('searchField').setValue("");
			var worklistModel = this.getView().getModel("worklistView");
			var worklistData = worklistModel.getData();
			// TO DO
			$.each(tbl.getSelectedIndices(), function(i, selItem) {
				// var commentCell = selItem.getCells()[8];
				// commentCell.getContent()[0].setEnabled(false);
				// commentCell.getContent()[1].setEnabled(false);
			});
			worklistData.saveFA = false;
			worklistData.saveFE = false;
			worklistData.saveASTE = false;
			worklistData.saveApr = false;
			worklistData.cancelDB = false;
			worklistData.saveButton = false;

		},
		delegateToUser: function(oEvent) {
			var tbl = this.getView().byId('table');
			if (tbl.getSelectedIndices().length === 0) {
				MessageBox.warning(
					"Please select a work item!");
				return;
			}
			var ctx = tbl.getContextByIndex(tbl.getSelectedIndices()[0]);
			var Pspid = ctx.getProperty(ctx.getPath() + "/Pspid");
			var filter = [new Filter("Pspid", "EQ", Pspid)];
			if (!this._valueHelpDialog) {
				var model = this.getView().getModel();
				this._valueHelpDialog = sap.ui.xmlfragment(
					"BillManagerWorklist.fragments.F4Help",
					this
				);
				this._valueHelpDialog.setModel(model);
				this.getView().addDependent(this._valueHelpDialog);
			}
			this._valueHelpDialog.getBinding("items").filter(filter);
			this._valueHelpDialog.open();
		},
		getGroupHeader: function(oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key,
				upperCase: false
			});
		},
		handleValueHelpBillofc: function(oEvent) {
			var sFrgmntName;
			sFrgmntName = "BillManagerWorklist.fragments.billingofc";
			if (!this._valueHelpBillofcDialog) {
				this._valueHelpBillofcDialog = sap.ui.xmlfragment(sFrgmntName, this);
				this.getView().addDependent(this._valueHelpBillofcDialog);
			}
			this._valueHelpBillofcDialog.getBinding("items").filter([]);
			this._valueHelpBillofcDialog.open();
		},
		_handleValueHelpConfirm: function(oEvent) {
			var aContext = oEvent.getParameter("selectedContexts")[0];
			this.setUpdateValues("ToUser", aContext.getProperty("Usrid"));
			//	this.onDelegateTo(aContext);
		},
		selfDelegate: function(oEvent) {
			this.setUpdateValues("ToUser", "SELF");
			//var delType = oEvent.getSource().data().delType;
			//this.onDelegateTo(null, delType);
		},
		setUpdateValues: function(field, value) {
			var tbl = this.getView().byId('table');
			$.each(tbl.getSelectedIndices(), function(i, item) {
				var oCtx = tbl.getContextByIndex(item);
				var path = oCtx.getPath() + "/" + field;
				oCtx.getModel().setProperty(path, value);
			});
		},
		onDelegatet: function(oEvt) {
			var tbl = this.getView().byId('table');
			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);
			var that = this;
			try {
				var batchChanges = [];
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPRS_MY_WORKLIST_SRV/");
				oModel.attachRequestSent(this.onRequestSent);
				$.each(tbl.getSelectedIndices(), function(i, item) {
					var OData = tbl.getContextByIndex(item).getObject();
					batchChanges.push(oModel.createBatchOperation("/WorklistBillManagerSet", "POST", OData));
				});
				oModel.addBatchChangeOperations(batchChanges);
				//submit changes and refresh the table and display message&nbsp;\&nbsp;
				oModel.setUseBatch(true);
				var msg = "Updated Successfully";
				oModel.submitBatch(function(data) {
					//tbl.getModel().refresh();
					var isSuccess = false;
					var receivedData = data.__batchResponses[0].__changeResponses;
					$.each(tbl.getSelectedIndices(), function(inx, o) {
						var sobj = tbl.getContextByIndex(o).getObject();
						var a = receivedData.filter(function(obj) {
							return obj.data.Vbeln === sobj.Vbeln;
						});
						//Changed by Hansapriya 30/11/2016 view btn color change
						var ctx = tbl.getContextByIndex(o);
						var m = ctx.getModel(ctx.getPath());
						//m.setProperty(ctx.getPath() + "/Comments", "newComments");
						if (a.length === 1) {
							m.setProperty(ctx.getPath() + "/Error", a[0].data.Error);
							m.setProperty(ctx.getPath() + "/Message", a[0].data.Message);
							//m.setProperty(ctx.getPath() + "/NewComments","");
							if (a[0].data.Iserror === "S") {
								isSuccess = true;
							}
						}
					});
					that.getView().setBusy(false);
					MessageBox.success(msg);
				}, function(err) {
					that.getView().setBusy(false);
					MessageBox.error(
						"Error occured!"
					);
				});
			} catch (e) {
				that.getView().setBusy(false);
			}
		},
		onDelegateTo_backup: function(aContext, delType) {
			var tbl = this.getView().byId('table');
			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);
			var that = this;
			try {
				var batchChanges = [];
				var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPRS_MY_WORKLIST_SRV/");
				oModel.attachRequestSent(this.onRequestSent);
				$.each(tbl.getSelectedIndices(), function(i, item) {
					var OData = tbl.getContextByIndex(item).getObject();
					OData.Action = delType === "" ? "SAVE" : "DELEGATE";
					OData.User = delType !== "SELF" ? aContext.getProperty("Usrid") : delType;
					batchChanges.push(oModel.createBatchOperation("/WorklistBillManagerSet", "POST", OData));
				});
				oModel.addBatchChangeOperations(batchChanges);
				//submit changes and refresh the table and display message&nbsp;\&nbsp;
				oModel.setUseBatch(true);
				var msg = aContext ? "Delegated successfully to User " + aContext.getProperty("Name") : "Delegated successfully";
				oModel.submitBatch(function(data) {
					tbl.getModel().refresh();
					that.getView().setBusy(false);
					MessageBox.success(msg);
				}, function(err) {
					that.getView().setBusy(false);
					MessageBox.error(
						"Error occured!"
					);
				});
			} catch (e) {
				that.getView().setBusy(false);
			}
		},
		_handleValueHelpSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter("Name1", sap.ui.model.FilterOperator.Contains, sValue);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter]);
		},
		handleBOfficeConfirm: function(oEvent) {
			var aContext = oEvent.getParameter("selectedContexts")[0];
			var searchModel = this.getView().getModel("searchModel");
			searchModel.setProperty("/Boffice", aContext.getProperty("Werks"));
		},
		onGoPress: function(oEvt) {
			var searchModel = this.getView().getModel("searchModel");
			var sfilters = [];
			if (searchModel.getProperty("/Boffice") && searchModel.getProperty("/Boffice") !== "") {
				sfilters.push(new Filter("Boffice", "EQ", searchModel.getProperty("/Boffice")));
			}
			if (searchModel.getProperty("/WorkDateFrom") && searchModel.getProperty("/WorkDateFrom") !== "") {
				sfilters.push(new Filter("DateFil", "GE", searchModel.getProperty("/WorkDateFrom")));
			}
			if (searchModel.getProperty("/WorkDateTo") && searchModel.getProperty("/WorkDateTo") !== "") {
				sfilters.push(new Filter("DateFil", "LE", searchModel.getProperty("/WorkDateTo")));
			}
			if (sfilters.length > 1) {
				this.getDtFrmSrv([new Filter(sfilters,true)]);
			} else {
				this.getDtFrmSrv(sfilters);
			}

			/*01 Jan 2017
						var tbl = this.getTable();
						var bind = tbl.getBinding("rows");
						if (sfilters.length > 1) {
							bind.filter([new Filter(sfilters, true)]);
						} else {
							bind.filter(sfilters);
						} 01 Jan 2017*/
			/*
						//	var bInfo = tbl.getBindingInfo("rows");
						bind.filter(sfilters);
						this.getTable().bindRows({
							path: "/WorklistBillManagerSet",
							filter: sfilters,
							parameters: {
								operationMode: 'Server'
							}
						});
						this.initBindingEventHandler();
						//tbl.getBinding().refresh(true); 
						*/
		},
		handleAuditTrailReport: function(oEvent) {
			var oSelItem = oEvent.getSource();
			var oContext = oSelItem.getBindingContext();
			var oObj = oContext.getObject();
			var oHref = "#ZPRS_WF_DA-display&/" + oObj.Vbeln;
			oSelItem.setHref(oHref);
		},
		onPressBill: function(oEvent) {
			var oSelItem = oEvent.getSource();
			var oContext = oSelItem.getBindingContext();
			var oObj = oContext.getObject(),
				billerUrl;

			billerUrl = "/sap/bc/ui5_ui5/sap/zprs_bedit/index.html#/main/" + oObj.Vbeln;
			sap.m.URLHelper.redirect(billerUrl, true);

		},
		// Switch to My WorkList Appilcation
		switchApp: function(oEvent) {
			//Changed by Hansapriya. 25/10/2016
			var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
			oCrossAppNav.toExternal({
				target: {
					semanticObject: "ZPRS_MY_WKLIST",
					action: "display"
				}
			});
		},
		handleChange: function(oEvent) {
			var Dateto = oEvent.getSource();
			var Datefrom = this.getView().byId("Datefrom");
			var bValid = Datefrom.getDateValue() ? Dateto.getDateValue().getTime() >= Datefrom.getDateValue().getTime() : false;

			if (bValid) {
				Dateto.setValueState(sap.ui.core.ValueState.None);
				Dateto.setValueStateText("");
			} else {
				Dateto.setValueState(sap.ui.core.ValueState.Error);
				Dateto.setValueStateText("'TO' Date should be greater than 'FROM'");
				Dateto.setDateValue(null);
			}
		}
	});
});