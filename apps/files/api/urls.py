from django.urls import path
from . import views

app_name = 'files_api'

urlpatterns = [
    path('', views.DirectoryListView.as_view(), name='list'),
    path('info/', views.FileInfoView.as_view(), name='info'),
    path('download/', views.FileDownloadView.as_view(), name='download'),
    path('upload/', views.FileUploadView.as_view(), name='upload'),
    path('mkdir/', views.FileCreateDirView.as_view(), name='mkdir'),
    path('delete/', views.FileDeleteView.as_view(), name='delete'),
    path('rename/', views.FileRenameView.as_view(), name='rename'),
    path('move/', views.FileMoveView.as_view(), name='move'),
    path('copy/', views.FileCopyView.as_view(), name='copy'),
    path('preview/', views.FilePreviewView.as_view(), name='preview'),
    path('save/', views.FileSaveView.as_view(), name='save'),
    path('grep/', views.FileGrepView.as_view(), name='grep'),
    path('archive/', views.FileArchiveView.as_view(), name='archive'),
    path('chmod/', views.FileChmodView.as_view(), name='chmod'),
    path('disk-usage/', views.FileDiskUsageView.as_view(), name='disk_usage'),
]
