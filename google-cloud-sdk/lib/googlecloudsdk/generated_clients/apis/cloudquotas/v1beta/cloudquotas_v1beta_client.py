"""Generated client library for cloudquotas version v1beta."""
# NOTE: This file is autogenerated and should not be edited by hand.

from __future__ import absolute_import

from apitools.base.py import base_api
from googlecloudsdk.generated_clients.apis.cloudquotas.v1beta import cloudquotas_v1beta_messages as messages


class CloudquotasV1beta(base_api.BaseApiClient):
  """Generated client library for service cloudquotas version v1beta."""

  MESSAGES_MODULE = messages
  BASE_URL = 'https://cloudquotas.googleapis.com/'
  MTLS_BASE_URL = 'https://cloudquotas.mtls.googleapis.com/'

  _PACKAGE = 'cloudquotas'
  _SCOPES = ['https://www.googleapis.com/auth/cloud-platform']
  _VERSION = 'v1beta'
  _CLIENT_ID = 'CLIENT_ID'
  _CLIENT_SECRET = 'CLIENT_SECRET'
  _USER_AGENT = 'google-cloud-sdk'
  _CLIENT_CLASS_NAME = 'CloudquotasV1beta'
  _URL_VERSION = 'v1beta'
  _API_KEY = None

  def __init__(self, url='', credentials=None,
               get_credentials=True, http=None, model=None,
               log_request=False, log_response=False,
               credentials_args=None, default_global_params=None,
               additional_http_headers=None, response_encoding=None):
    """Create a new cloudquotas handle."""
    url = url or self.BASE_URL
    super(CloudquotasV1beta, self).__init__(
        url, credentials=credentials,
        get_credentials=get_credentials, http=http, model=model,
        log_request=log_request, log_response=log_response,
        credentials_args=credentials_args,
        default_global_params=default_global_params,
        additional_http_headers=additional_http_headers,
        response_encoding=response_encoding)
    self.folders_locations_quotaPreferences = self.FoldersLocationsQuotaPreferencesService(self)
    self.folders_locations_services_quotaInfos = self.FoldersLocationsServicesQuotaInfosService(self)
    self.folders_locations_services = self.FoldersLocationsServicesService(self)
    self.folders_locations = self.FoldersLocationsService(self)
    self.folders = self.FoldersService(self)
    self.organizations_locations_quotaPreferences = self.OrganizationsLocationsQuotaPreferencesService(self)
    self.organizations_locations_services_quotaInfos = self.OrganizationsLocationsServicesQuotaInfosService(self)
    self.organizations_locations_services = self.OrganizationsLocationsServicesService(self)
    self.organizations_locations = self.OrganizationsLocationsService(self)
    self.organizations = self.OrganizationsService(self)
    self.projects_locations_quotaPreferences = self.ProjectsLocationsQuotaPreferencesService(self)
    self.projects_locations_services_quotaInfos = self.ProjectsLocationsServicesQuotaInfosService(self)
    self.projects_locations_services = self.ProjectsLocationsServicesService(self)
    self.projects_locations = self.ProjectsLocationsService(self)
    self.projects = self.ProjectsService(self)

  class FoldersLocationsQuotaPreferencesService(base_api.BaseApiService):
    """Service class for the folders_locations_quotaPreferences resource."""

    _NAME = 'folders_locations_quotaPreferences'

    def __init__(self, client):
      super(CloudquotasV1beta.FoldersLocationsQuotaPreferencesService, self).__init__(client)
      self._upload_configs = {
          }

    def Create(self, request, global_params=None):
      r"""Creates a new QuotaPreference that declares the desired value for a quota.

      Args:
        request: (CloudquotasFoldersLocationsQuotaPreferencesCreateRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Create')
      return self._RunMethod(
          config, request, global_params=global_params)

    Create.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/quotaPreferences',
        http_method='POST',
        method_id='cloudquotas.folders.locations.quotaPreferences.create',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['ignoreSafetyChecks', 'quotaPreferenceId'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='quotaPreference',
        request_type_name='CloudquotasFoldersLocationsQuotaPreferencesCreateRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def Get(self, request, global_params=None):
      r"""Gets details of a single QuotaPreference.

      Args:
        request: (CloudquotasFoldersLocationsQuotaPreferencesGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='GET',
        method_id='cloudquotas.folders.locations.quotaPreferences.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasFoldersLocationsQuotaPreferencesGetRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaPreferences in a given project, folder or organization.

      Args:
        request: (CloudquotasFoldersLocationsQuotaPreferencesListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaPreferencesResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/quotaPreferences',
        http_method='GET',
        method_id='cloudquotas.folders.locations.quotaPreferences.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['filter', 'orderBy', 'pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='',
        request_type_name='CloudquotasFoldersLocationsQuotaPreferencesListRequest',
        response_type_name='ListQuotaPreferencesResponse',
        supports_download=False,
    )

    def Patch(self, request, global_params=None):
      r"""Updates the parameters of a single QuotaPreference. It can updates the config in any states, not just the ones pending approval.

      Args:
        request: (CloudquotasFoldersLocationsQuotaPreferencesPatchRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Patch')
      return self._RunMethod(
          config, request, global_params=global_params)

    Patch.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='PATCH',
        method_id='cloudquotas.folders.locations.quotaPreferences.patch',
        ordered_params=['name'],
        path_params=['name'],
        query_params=['allowMissing', 'ignoreSafetyChecks', 'updateMask', 'validateOnly'],
        relative_path='v1beta/{+name}',
        request_field='quotaPreference',
        request_type_name='CloudquotasFoldersLocationsQuotaPreferencesPatchRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

  class FoldersLocationsServicesQuotaInfosService(base_api.BaseApiService):
    """Service class for the folders_locations_services_quotaInfos resource."""

    _NAME = 'folders_locations_services_quotaInfos'

    def __init__(self, client):
      super(CloudquotasV1beta.FoldersLocationsServicesQuotaInfosService, self).__init__(client)
      self._upload_configs = {
          }

    def Get(self, request, global_params=None):
      r"""Retrieve the QuotaInfo of a quota for a project, folder or organization.

      Args:
        request: (CloudquotasFoldersLocationsServicesQuotaInfosGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaInfo) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/services/{servicesId}/quotaInfos/{quotaInfosId}',
        http_method='GET',
        method_id='cloudquotas.folders.locations.services.quotaInfos.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasFoldersLocationsServicesQuotaInfosGetRequest',
        response_type_name='QuotaInfo',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaInfos of all quotas for a given project, folder or organization.

      Args:
        request: (CloudquotasFoldersLocationsServicesQuotaInfosListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaInfosResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/folders/{foldersId}/locations/{locationsId}/services/{servicesId}/quotaInfos',
        http_method='GET',
        method_id='cloudquotas.folders.locations.services.quotaInfos.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaInfos',
        request_field='',
        request_type_name='CloudquotasFoldersLocationsServicesQuotaInfosListRequest',
        response_type_name='ListQuotaInfosResponse',
        supports_download=False,
    )

  class FoldersLocationsServicesService(base_api.BaseApiService):
    """Service class for the folders_locations_services resource."""

    _NAME = 'folders_locations_services'

    def __init__(self, client):
      super(CloudquotasV1beta.FoldersLocationsServicesService, self).__init__(client)
      self._upload_configs = {
          }

  class FoldersLocationsService(base_api.BaseApiService):
    """Service class for the folders_locations resource."""

    _NAME = 'folders_locations'

    def __init__(self, client):
      super(CloudquotasV1beta.FoldersLocationsService, self).__init__(client)
      self._upload_configs = {
          }

  class FoldersService(base_api.BaseApiService):
    """Service class for the folders resource."""

    _NAME = 'folders'

    def __init__(self, client):
      super(CloudquotasV1beta.FoldersService, self).__init__(client)
      self._upload_configs = {
          }

  class OrganizationsLocationsQuotaPreferencesService(base_api.BaseApiService):
    """Service class for the organizations_locations_quotaPreferences resource."""

    _NAME = 'organizations_locations_quotaPreferences'

    def __init__(self, client):
      super(CloudquotasV1beta.OrganizationsLocationsQuotaPreferencesService, self).__init__(client)
      self._upload_configs = {
          }

    def Create(self, request, global_params=None):
      r"""Creates a new QuotaPreference that declares the desired value for a quota.

      Args:
        request: (CloudquotasOrganizationsLocationsQuotaPreferencesCreateRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Create')
      return self._RunMethod(
          config, request, global_params=global_params)

    Create.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/quotaPreferences',
        http_method='POST',
        method_id='cloudquotas.organizations.locations.quotaPreferences.create',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['ignoreSafetyChecks', 'quotaPreferenceId'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='quotaPreference',
        request_type_name='CloudquotasOrganizationsLocationsQuotaPreferencesCreateRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def Get(self, request, global_params=None):
      r"""Gets details of a single QuotaPreference.

      Args:
        request: (CloudquotasOrganizationsLocationsQuotaPreferencesGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='GET',
        method_id='cloudquotas.organizations.locations.quotaPreferences.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasOrganizationsLocationsQuotaPreferencesGetRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaPreferences in a given project, folder or organization.

      Args:
        request: (CloudquotasOrganizationsLocationsQuotaPreferencesListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaPreferencesResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/quotaPreferences',
        http_method='GET',
        method_id='cloudquotas.organizations.locations.quotaPreferences.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['filter', 'orderBy', 'pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='',
        request_type_name='CloudquotasOrganizationsLocationsQuotaPreferencesListRequest',
        response_type_name='ListQuotaPreferencesResponse',
        supports_download=False,
    )

    def Patch(self, request, global_params=None):
      r"""Updates the parameters of a single QuotaPreference. It can updates the config in any states, not just the ones pending approval.

      Args:
        request: (CloudquotasOrganizationsLocationsQuotaPreferencesPatchRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Patch')
      return self._RunMethod(
          config, request, global_params=global_params)

    Patch.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='PATCH',
        method_id='cloudquotas.organizations.locations.quotaPreferences.patch',
        ordered_params=['name'],
        path_params=['name'],
        query_params=['allowMissing', 'ignoreSafetyChecks', 'updateMask', 'validateOnly'],
        relative_path='v1beta/{+name}',
        request_field='quotaPreference',
        request_type_name='CloudquotasOrganizationsLocationsQuotaPreferencesPatchRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

  class OrganizationsLocationsServicesQuotaInfosService(base_api.BaseApiService):
    """Service class for the organizations_locations_services_quotaInfos resource."""

    _NAME = 'organizations_locations_services_quotaInfos'

    def __init__(self, client):
      super(CloudquotasV1beta.OrganizationsLocationsServicesQuotaInfosService, self).__init__(client)
      self._upload_configs = {
          }

    def Get(self, request, global_params=None):
      r"""Retrieve the QuotaInfo of a quota for a project, folder or organization.

      Args:
        request: (CloudquotasOrganizationsLocationsServicesQuotaInfosGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaInfo) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/services/{servicesId}/quotaInfos/{quotaInfosId}',
        http_method='GET',
        method_id='cloudquotas.organizations.locations.services.quotaInfos.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasOrganizationsLocationsServicesQuotaInfosGetRequest',
        response_type_name='QuotaInfo',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaInfos of all quotas for a given project, folder or organization.

      Args:
        request: (CloudquotasOrganizationsLocationsServicesQuotaInfosListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaInfosResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/organizations/{organizationsId}/locations/{locationsId}/services/{servicesId}/quotaInfos',
        http_method='GET',
        method_id='cloudquotas.organizations.locations.services.quotaInfos.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaInfos',
        request_field='',
        request_type_name='CloudquotasOrganizationsLocationsServicesQuotaInfosListRequest',
        response_type_name='ListQuotaInfosResponse',
        supports_download=False,
    )

  class OrganizationsLocationsServicesService(base_api.BaseApiService):
    """Service class for the organizations_locations_services resource."""

    _NAME = 'organizations_locations_services'

    def __init__(self, client):
      super(CloudquotasV1beta.OrganizationsLocationsServicesService, self).__init__(client)
      self._upload_configs = {
          }

  class OrganizationsLocationsService(base_api.BaseApiService):
    """Service class for the organizations_locations resource."""

    _NAME = 'organizations_locations'

    def __init__(self, client):
      super(CloudquotasV1beta.OrganizationsLocationsService, self).__init__(client)
      self._upload_configs = {
          }

  class OrganizationsService(base_api.BaseApiService):
    """Service class for the organizations resource."""

    _NAME = 'organizations'

    def __init__(self, client):
      super(CloudquotasV1beta.OrganizationsService, self).__init__(client)
      self._upload_configs = {
          }

  class ProjectsLocationsQuotaPreferencesService(base_api.BaseApiService):
    """Service class for the projects_locations_quotaPreferences resource."""

    _NAME = 'projects_locations_quotaPreferences'

    def __init__(self, client):
      super(CloudquotasV1beta.ProjectsLocationsQuotaPreferencesService, self).__init__(client)
      self._upload_configs = {
          }

    def Create(self, request, global_params=None):
      r"""Creates a new QuotaPreference that declares the desired value for a quota.

      Args:
        request: (CloudquotasProjectsLocationsQuotaPreferencesCreateRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Create')
      return self._RunMethod(
          config, request, global_params=global_params)

    Create.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaPreferences',
        http_method='POST',
        method_id='cloudquotas.projects.locations.quotaPreferences.create',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['ignoreSafetyChecks', 'quotaPreferenceId'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='quotaPreference',
        request_type_name='CloudquotasProjectsLocationsQuotaPreferencesCreateRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def Get(self, request, global_params=None):
      r"""Gets details of a single QuotaPreference.

      Args:
        request: (CloudquotasProjectsLocationsQuotaPreferencesGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='GET',
        method_id='cloudquotas.projects.locations.quotaPreferences.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasProjectsLocationsQuotaPreferencesGetRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaPreferences in a given project, folder or organization.

      Args:
        request: (CloudquotasProjectsLocationsQuotaPreferencesListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaPreferencesResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaPreferences',
        http_method='GET',
        method_id='cloudquotas.projects.locations.quotaPreferences.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['filter', 'orderBy', 'pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaPreferences',
        request_field='',
        request_type_name='CloudquotasProjectsLocationsQuotaPreferencesListRequest',
        response_type_name='ListQuotaPreferencesResponse',
        supports_download=False,
    )

    def Patch(self, request, global_params=None):
      r"""Updates the parameters of a single QuotaPreference. It can updates the config in any states, not just the ones pending approval.

      Args:
        request: (CloudquotasProjectsLocationsQuotaPreferencesPatchRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaPreference) The response message.
      """
      config = self.GetMethodConfig('Patch')
      return self._RunMethod(
          config, request, global_params=global_params)

    Patch.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaPreferences/{quotaPreferencesId}',
        http_method='PATCH',
        method_id='cloudquotas.projects.locations.quotaPreferences.patch',
        ordered_params=['name'],
        path_params=['name'],
        query_params=['allowMissing', 'ignoreSafetyChecks', 'updateMask', 'validateOnly'],
        relative_path='v1beta/{+name}',
        request_field='quotaPreference',
        request_type_name='CloudquotasProjectsLocationsQuotaPreferencesPatchRequest',
        response_type_name='QuotaPreference',
        supports_download=False,
    )

  class ProjectsLocationsServicesQuotaInfosService(base_api.BaseApiService):
    """Service class for the projects_locations_services_quotaInfos resource."""

    _NAME = 'projects_locations_services_quotaInfos'

    def __init__(self, client):
      super(CloudquotasV1beta.ProjectsLocationsServicesQuotaInfosService, self).__init__(client)
      self._upload_configs = {
          }

    def Get(self, request, global_params=None):
      r"""Retrieve the QuotaInfo of a quota for a project, folder or organization.

      Args:
        request: (CloudquotasProjectsLocationsServicesQuotaInfosGetRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaInfo) The response message.
      """
      config = self.GetMethodConfig('Get')
      return self._RunMethod(
          config, request, global_params=global_params)

    Get.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/services/{servicesId}/quotaInfos/{quotaInfosId}',
        http_method='GET',
        method_id='cloudquotas.projects.locations.services.quotaInfos.get',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasProjectsLocationsServicesQuotaInfosGetRequest',
        response_type_name='QuotaInfo',
        supports_download=False,
    )

    def List(self, request, global_params=None):
      r"""Lists QuotaInfos of all quotas for a given project, folder or organization.

      Args:
        request: (CloudquotasProjectsLocationsServicesQuotaInfosListRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (ListQuotaInfosResponse) The response message.
      """
      config = self.GetMethodConfig('List')
      return self._RunMethod(
          config, request, global_params=global_params)

    List.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/services/{servicesId}/quotaInfos',
        http_method='GET',
        method_id='cloudquotas.projects.locations.services.quotaInfos.list',
        ordered_params=['parent'],
        path_params=['parent'],
        query_params=['pageSize', 'pageToken'],
        relative_path='v1beta/{+parent}/quotaInfos',
        request_field='',
        request_type_name='CloudquotasProjectsLocationsServicesQuotaInfosListRequest',
        response_type_name='ListQuotaInfosResponse',
        supports_download=False,
    )

  class ProjectsLocationsServicesService(base_api.BaseApiService):
    """Service class for the projects_locations_services resource."""

    _NAME = 'projects_locations_services'

    def __init__(self, client):
      super(CloudquotasV1beta.ProjectsLocationsServicesService, self).__init__(client)
      self._upload_configs = {
          }

  class ProjectsLocationsService(base_api.BaseApiService):
    """Service class for the projects_locations resource."""

    _NAME = 'projects_locations'

    def __init__(self, client):
      super(CloudquotasV1beta.ProjectsLocationsService, self).__init__(client)
      self._upload_configs = {
          }

    def GetQuotaAdjusterSettings(self, request, global_params=None):
      r"""RPC Method for getting QuotaAdjusterSettings based on the request.

      Args:
        request: (CloudquotasProjectsLocationsGetQuotaAdjusterSettingsRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaAdjusterSettings) The response message.
      """
      config = self.GetMethodConfig('GetQuotaAdjusterSettings')
      return self._RunMethod(
          config, request, global_params=global_params)

    GetQuotaAdjusterSettings.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaAdjusterSettings',
        http_method='GET',
        method_id='cloudquotas.projects.locations.getQuotaAdjusterSettings',
        ordered_params=['name'],
        path_params=['name'],
        query_params=[],
        relative_path='v1beta/{+name}',
        request_field='',
        request_type_name='CloudquotasProjectsLocationsGetQuotaAdjusterSettingsRequest',
        response_type_name='QuotaAdjusterSettings',
        supports_download=False,
    )

    def UpdateQuotaAdjusterSettings(self, request, global_params=None):
      r"""RPC Method for updating QuotaAdjusterSettings based on the request.

      Args:
        request: (CloudquotasProjectsLocationsUpdateQuotaAdjusterSettingsRequest) input message
        global_params: (StandardQueryParameters, default: None) global arguments
      Returns:
        (QuotaAdjusterSettings) The response message.
      """
      config = self.GetMethodConfig('UpdateQuotaAdjusterSettings')
      return self._RunMethod(
          config, request, global_params=global_params)

    UpdateQuotaAdjusterSettings.method_config = lambda: base_api.ApiMethodInfo(
        flat_path='v1beta/projects/{projectsId}/locations/{locationsId}/quotaAdjusterSettings',
        http_method='PATCH',
        method_id='cloudquotas.projects.locations.updateQuotaAdjusterSettings',
        ordered_params=['name'],
        path_params=['name'],
        query_params=['updateMask', 'validateOnly'],
        relative_path='v1beta/{+name}',
        request_field='quotaAdjusterSettings',
        request_type_name='CloudquotasProjectsLocationsUpdateQuotaAdjusterSettingsRequest',
        response_type_name='QuotaAdjusterSettings',
        supports_download=False,
    )

  class ProjectsService(base_api.BaseApiService):
    """Service class for the projects resource."""

    _NAME = 'projects'

    def __init__(self, client):
      super(CloudquotasV1beta.ProjectsService, self).__init__(client)
      self._upload_configs = {
          }
