Imports System
Imports System.Text
Imports System.Web
Imports System.Web.UI
Imports System.Web.UI.WebControls

' Partial class to provide server-side handlers for dynamically declared ASP.NET controls.
Partial Public Class rendezvous_aspx
    Inherits Page

    Private Const RefreshCompaniesScriptKey As String = "refreshEditCompanies"
    Private Const RefreshAddressesScriptKey As String = "refreshEditAddresses"
    Private Const CompanySelectionScriptKey As String = "onEditCompanyChanged"
    Private Const AddressSelectionScriptKey As String = "onEditAddressChanged"

    Protected Sub btnRefreshEditCompanies_Click(ByVal sender As Object, ByVal e As EventArgs)
        ' Trigger a client side refresh so that the edit company dropdown picks up new entries without reloading the whole page.
        RegisterAjaxCallback(RefreshCompaniesScriptKey, "Coremorphic.refreshEditCompanies")
    End Sub

    Protected Sub ddlEditCompany_SelectedIndexChanged(ByVal sender As Object, ByVal e As EventArgs)
        ' Keep the edit address dropdown in sync with the newly selected company without a full postback.
        RegisterAjaxCallback(CompanySelectionScriptKey, "Coremorphic.onEditCompanyChanged")
    End Sub

    Protected Sub btnRefreshEditAddresses_Click(ByVal sender As Object, ByVal e As EventArgs)
        ' Allow the address list to be refreshed when new addresses are added from another tab.
        RegisterAjaxCallback(RefreshAddressesScriptKey, "Coremorphic.refreshEditAddresses")
    End Sub

    Protected Sub ddlEditAddress_SelectedIndexChanged(ByVal sender As Object, ByVal e As EventArgs)
        ' Notify the client side widgets that the selected edit address has changed.
        RegisterAjaxCallback(AddressSelectionScriptKey, "Coremorphic.onEditAddressChanged")
    End Sub

    Private Sub RegisterAjaxCallback(ByVal key As String, ByVal callbackName As String)
        Dim script As String = BuildCallbackInvocation(callbackName)

        If ScriptManager.GetCurrent(Me) Is Nothing Then
            ' If the page is not hosted inside an UpdatePanel the script manager will be missing.
            ' Fall back to the classic ClientScript registration so that the callback is still emitted.
            ClientScript.RegisterStartupScript(Me.GetType(), key, script, True)
        Else
            ScriptManager.RegisterStartupScript(Me, Me.GetType(), key, script, True)
        End If
    End Sub

    Private Function BuildCallbackInvocation(ByVal callbackPath As String) As String
        If String.IsNullOrWhiteSpace(callbackPath) Then
            Return String.Empty
        End If

        Dim safePath As String = callbackPath.Trim()
        Dim encodedPath As String = HttpUtility.JavaScriptStringEncode(safePath)
        Dim builder As New StringBuilder()

        builder.Append("(function(){var parts=""")
        builder.Append(encodedPath)
        builder.Append(""".split('.');var context=window;")
        builder.Append("for(var i=0;i<parts.length;i++){if(context===undefined || context===null){return;}")
        builder.Append("if(i===parts.length-1){var fn=context[parts[i]];if(typeof fn==='function'){fn.call(context);}return;}context=context[parts[i]];}}");
        builder.Append("})();")

        Return builder.ToString()
    End Function
End Class
