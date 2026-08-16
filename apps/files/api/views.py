import posixpath
import ntpath
import mimetypes
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from rest_framework import views, status, permissions
from rest_framework.response import Response

from apps.devices.models import Device
from apps.connectors.factory import ConnectorFactory
from apps.connectors.exceptions import (
    ConnectorException,
    FileNotFoundException,
    FileAlreadyExistsException,
    PathTraversalException,
    PermissionDeniedException,
    FileSizeLimitExceededException
)
from apps.files.validators import validate_safe_path, validate_file_size
from apps.accounts.permissions import CanManageFiles
from apps.audit.services import log_audit_event


def get_breadcrumbs(path: str, is_windows: bool, default_path: str):
    """Generates structured breadcrumb array for navigation."""
    if not path:
        path = default_path

    breadcrumbs = []
    if is_windows:
        parts = [p for p in path.replace('/', '\\').split('\\') if p]
        accum = ''
        for i, part in enumerate(parts):
            if i == 0:
                accum = part + '\\'
                breadcrumbs.append({'name': part, 'path': accum})
            else:
                accum = accum.rstrip('\\') + '\\' + part
                breadcrumbs.append({'name': part, 'path': accum})
    else:
        parts = [p for p in path.split('/') if p]
        breadcrumbs.append({'name': 'kök (/)', 'path': '/'})
        accum = ''
        for part in parts:
            accum += '/' + part
            breadcrumbs.append({'name': part, 'path': accum})

    return breadcrumbs


class DirectoryListView(views.APIView):
    """
    GET: List contents of a remote directory with breadcrumbs and root paths.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        raw_path = request.query_params.get('path')

        try:
            safe_path = validate_safe_path(raw_path) if raw_path else None
            connector = ConnectorFactory.get_connector(device)
            current_path = safe_path or connector.get_default_path()
            entries = connector.list_directory(current_path)

            log_audit_event(
                user=request.user,
                operation='LIST_DIR',
                device=device,
                path=current_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'current_path': current_path,
                'path_separator': connector.get_path_separator(),
                'operating_system': device.operating_system,
                'is_windows': device.is_windows,
                'roots': connector.get_root_paths(),
                'breadcrumbs': get_breadcrumbs(current_path, device.is_windows, connector.get_default_path()),
                'entries': [e.to_dict() for e in entries],
                'count': len(entries),
            })
        except ConnectorException as e:
            log_audit_event(
                user=request.user,
                operation='LIST_DIR',
                device=device,
                path=raw_path or '',
                status='FAILURE',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'error': str(e), 'code': e.code}
            )
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileInfoView(views.APIView):
    """
    GET: Retrieve metadata and file properties.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.query_params.get('path', '')

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            info = connector.get_file_info(safe_path)
            return Response(info.to_dict())
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileDownloadView(views.APIView):
    """
    GET: Stream binary download of remote file.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.query_params.get('path', '')

        # Permission check
        profile = getattr(request.user, 'profile', None)
        if not (profile and profile.can_download_files):
            log_audit_event(
                user=request.user,
                operation='DOWNLOAD',
                device=device,
                path=path,
                status='DENIED',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({'error': 'Dosya indirme yetkiniz bulunmamaktadır.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            file_stream = connector.download_file(safe_path)

            filename = ntpath.basename(safe_path) if device.is_windows else posixpath.basename(safe_path)
            mime_type, _ = mimetypes.guess_type(filename)
            mime_type = mime_type or 'application/octet-stream'

            log_audit_event(
                user=request.user,
                operation='DOWNLOAD',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'filename': filename}
            )

            response = FileResponse(file_stream, content_type=mime_type)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except ConnectorException as e:
            log_audit_event(
                user=request.user,
                operation='DOWNLOAD',
                device=device,
                path=path,
                status='FAILURE',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'error': str(e)}
            )
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileUploadView(views.APIView):
    """
    POST: Upload file to remote directory (Multipart).
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        target_dir = request.data.get('path', '')
        file_obj = request.FILES.get('file')
        overwrite = str(request.data.get('overwrite', 'false')).lower() in ['true', '1']

        if not file_obj:
            return Response({'error': 'Lütfen yüklenecek bir dosya seçin.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_safe_path(target_dir)
            validate_file_size(file_obj)

            connector = ConnectorFactory.get_connector(device)
            sep = connector.get_path_separator()
            full_path = f"{target_dir.rstrip(sep)}{sep}{file_obj.name}"

            connector.upload_file(full_path, file_obj, overwrite=overwrite)

            log_audit_event(
                user=request.user,
                operation='UPLOAD',
                device=device,
                path=full_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'filename': file_obj.name, 'size': file_obj.size}
            )

            return Response({
                'status': 'success',
                'message': f"'{file_obj.name}' başarıyla yüklendi.",
                'path': full_path
            }, status=status.HTTP_201_CREATED)
        except ConnectorException as e:
            log_audit_event(
                user=request.user,
                operation='UPLOAD',
                device=device,
                path=target_dir,
                status='FAILURE',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'error': str(e)}
            )
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileCreateDirView(views.APIView):
    """
    POST: Create a new directory.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        parent_path = request.data.get('path', '')
        folder_name = (request.data.get('folder_name') or request.data.get('name') or '').strip()

        if not folder_name:
            return Response({'error': 'Klasör ismi boş bırakılamaz.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_safe_path(parent_path)
            validate_safe_path(folder_name)

            connector = ConnectorFactory.get_connector(device)
            sep = connector.get_path_separator()
            new_dir_path = f"{parent_path.rstrip(sep)}{sep}{folder_name}"

            connector.create_directory(new_dir_path)

            log_audit_event(
                user=request.user,
                operation='MKDIR',
                device=device,
                path=new_dir_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({'status': 'success', 'message': f"'{folder_name}' klasörü oluşturuldu.", 'path': new_dir_path})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileDeleteView(views.APIView):
    """
    POST: Delete a file or directory.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.data.get('path', '')

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            connector.delete_item(safe_path)

            log_audit_event(
                user=request.user,
                operation='DELETE_FILE',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({'status': 'success', 'message': 'Öğe başarıyla silindi.'})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileRenameView(views.APIView):
    """
    POST: Rename a file or directory.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.data.get('path', '')
        new_name = request.data.get('new_name', '').strip()

        if not new_name:
            return Response({'error': 'Yeni isim belirtilmelidir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            safe_path = validate_safe_path(path)
            validate_safe_path(new_name)
            connector = ConnectorFactory.get_connector(device)
            new_path = connector.rename_item(safe_path, new_name)

            log_audit_event(
                user=request.user,
                operation='RENAME_FILE',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'new_name': new_name, 'new_path': new_path}
            )

            return Response({'status': 'success', 'message': 'Öğe yeniden adlandırıldı.', 'new_path': new_path})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileMoveView(views.APIView):
    """
    POST: Move a file/dir to destination directory.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        src_path = request.data.get('src_path', '')
        dst_dir = request.data.get('dst_dir', '')

        try:
            safe_src = validate_safe_path(src_path)
            safe_dst = validate_safe_path(dst_dir)
            connector = ConnectorFactory.get_connector(device)
            connector.move_item(safe_src, safe_dst)

            log_audit_event(
                user=request.user,
                operation='MOVE_FILE',
                device=device,
                path=safe_src,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'dst_dir': safe_dst}
            )

            return Response({'status': 'success', 'message': 'Dosya başarıyla taşındı.'})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileCopyView(views.APIView):
    """
    POST: Copy a file to destination directory.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        src_path = request.data.get('src_path', '')
        dst_dir = request.data.get('dst_dir', '')

        try:
            safe_src = validate_safe_path(src_path)
            safe_dst = validate_safe_path(dst_dir)
            connector = ConnectorFactory.get_connector(device)
            connector.copy_item(safe_src, safe_dst)

            log_audit_event(
                user=request.user,
                operation='COPY_FILE',
                device=device,
                path=safe_src,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'dst_dir': safe_dst}
            )

            return Response({'status': 'success', 'message': 'Dosya başarıyla kopyalandı.'})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FilePreviewView(views.APIView):
    """
    GET: Retrieve text file content for Monaco Editor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.query_params.get('path', '')

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            content = connector.get_file_content(safe_path)

            filename = ntpath.basename(safe_path) if device.is_windows else posixpath.basename(safe_path)
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            
            # Map extension to Monaco Editor language id
            lang_map = {
                'py': 'python',
                'js': 'javascript',
                'json': 'json',
                'html': 'html',
                'css': 'css',
                'sh': 'shell',
                'bash': 'shell',
                'conf': 'ini',
                'ini': 'ini',
                'yaml': 'yaml',
                'yml': 'yaml',
                'xml': 'xml',
                'sql': 'sql',
                'md': 'markdown',
                'txt': 'plaintext',
                'log': 'plaintext',
            }
            language = lang_map.get(ext, 'plaintext')

            log_audit_event(
                user=request.user,
                operation='PREVIEW_FILE',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'name': filename,
                'path': safe_path,
                'content': content,
                'language': language,
                'size': len(content),
            })
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileSaveView(views.APIView):
    """
    POST: Save modified text content to file.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.data.get('path', '')
        content = request.data.get('content', '')

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            connector.save_file_content(safe_path, content)

            log_audit_event(
                user=request.user,
                operation='SAVE_FILE',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'size': len(content)}
            )

            return Response({'status': 'success', 'message': 'Dosya başarıyla kaydedildi.'})
        except ConnectorException as e:
            return Response({'error': e.message, 'code': e.code}, status=status.HTTP_400_BAD_REQUEST)


class FileGrepView(views.APIView):
    """
    POST: Search for text content inside files in a remote directory (Grep).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.data.get('path', '/')
        query = request.data.get('query', '').strip()
        case_sensitive = bool(request.data.get('case_sensitive', False))

        if not query:
            return Response({'error': 'Arama terimi boş olamaz.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            matches = []

            if device.operating_system == 'LINUX':
                flags = '-rnI' if case_sensitive else '-rnIi'
                cmd = f"grep {flags} --exclude-dir='.git' --max-count=50 \"{query}\" \"{safe_path}\" 2>/dev/null | head -n 40"
                res = connector.execute_command(cmd)
                for line in res.stdout.splitlines():
                    if ':' in line:
                        parts = line.split(':', 2)
                        if len(parts) >= 3:
                            matches.append({
                                'file': parts[0],
                                'line_number': parts[1],
                                'snippet': parts[2].strip()[:180]
                            })
            else:
                cmd = f"Get-ChildItem -Path '{safe_path}' -Recurse -File -ErrorAction SilentlyContinue | Select-String -Pattern '{query}' | Select-Object -First 30 | ForEach-Object {{ \"$($_.Path):$($_.LineNumber):$($_.Line)\" }}"
                res = connector.execute_command(cmd)
                for line in res.stdout.splitlines():
                    if ':' in line:
                        parts = line.split(':', 2)
                        if len(parts) >= 3:
                            matches.append({
                                'file': parts[0],
                                'line_number': parts[1],
                                'snippet': parts[2].strip()[:180]
                            })

            log_audit_event(
                user=request.user,
                operation='GREP_SEARCH',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'query': query, 'match_count': len(matches)}
            )

            return Response({
                'query': query,
                'path': safe_path,
                'count': len(matches),
                'matches': matches
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FileArchiveView(views.APIView):
    """
    POST: Compress files to archive or extract archive on remote machine.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        action = request.data.get('action', 'compress')
        archive_path = request.data.get('archive_path', '')
        source_paths = request.data.get('source_paths', [])
        extract_to = request.data.get('extract_to', '')

        try:
            connector = ConnectorFactory.get_connector(device)
            if action == 'compress':
                if not source_paths or not archive_path:
                    return Response({'error': 'Kaynak dosyalar ve hedef arşiv adı gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

                safe_archive = validate_safe_path(archive_path)
                sources_str = ' '.join([f'"{validate_safe_path(p)}"' for p in source_paths])

                if safe_archive.endswith('.tar.gz') or safe_archive.endswith('.tgz'):
                    cmd = f"tar -czf \"{safe_archive}\" {sources_str}"
                elif safe_archive.endswith('.zip'):
                    cmd = f"zip -r \"{safe_archive}\" {sources_str}"
                else:
                    cmd = f"tar -czf \"{safe_archive}.tar.gz\" {sources_str}"
                    safe_archive += ".tar.gz"

                res = connector.execute_command(cmd)
                msg = f"Arşiv başarıyla oluşturuldu: {safe_archive}"

            elif action == 'extract':
                if not archive_path:
                    return Response({'error': 'Açılacak arşiv dosyası gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

                safe_archive = validate_safe_path(archive_path)
                dest = validate_safe_path(extract_to) if extract_to else posixpath.dirname(safe_archive)

                if safe_archive.endswith('.zip'):
                    cmd = f"unzip -o \"{safe_archive}\" -d \"{dest}\""
                else:
                    cmd = f"tar -xzf \"{safe_archive}\" -C \"{dest}\""

                res = connector.execute_command(cmd)
                msg = f"Arşiv başarıyla çıkarıldı: {dest}"
            else:
                return Response({'error': 'Geçersiz işlem.'}, status=status.HTTP_400_BAD_REQUEST)

            log_audit_event(
                user=request.user,
                operation='ARCHIVE_OPERATION',
                device=device,
                path=archive_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'action': action}
            )

            return Response({'status': 'success', 'message': msg}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FileChmodView(views.APIView):
    """
    POST: Update file permissions (chmod) and ownership (chown) on remote host.
    """
    permission_classes = [CanManageFiles]

    def post(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.data.get('path', '')
        mode = request.data.get('mode', '').strip()
        owner = request.data.get('owner', '').strip()
        recursive = bool(request.data.get('recursive', False))

        if not path:
            return Response({'error': 'Dosya yolu gereklidir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            rec_flag = '-R ' if recursive else ''

            if mode:
                clean_mode = mode.lstrip('0')
                cmd = f"chmod {rec_flag}{clean_mode} \"{safe_path}\""
                connector.execute_command(cmd)

            if owner:
                cmd = f"chown {rec_flag}{owner} \"{safe_path}\""
                connector.execute_command(cmd)

            log_audit_event(
                user=request.user,
                operation='CHMOD_FILE',
                device=device,
                path=safe_path,
                status='SUCCESS',
                ip_address=request.META.get('REMOTE_ADDR'),
                metadata={'mode': mode, 'owner': owner, 'recursive': recursive}
            )

            return Response({'status': 'success', 'message': f"'{safe_path}' izinleri güncellendi ({mode or owner})."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FileDiskUsageView(views.APIView):
    """
    GET: Get disk usage breakdown for items in the current directory.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, device_id):
        device = get_object_or_404(Device, id=device_id)
        path = request.query_params.get('path', '/')

        try:
            safe_path = validate_safe_path(path)
            connector = ConnectorFactory.get_connector(device)
            items = []

            if device.operating_system == 'LINUX':
                cmd = f"du -sh \"{safe_path}\"/* 2>/dev/null | sort -hr | head -n 25"
                res = connector.execute_command(cmd)
                for line in res.stdout.splitlines():
                    parts = line.split('\t', 1)
                    if len(parts) == 2:
                        size_str, item_path = parts[0].strip(), parts[1].strip()
                        item_name = posixpath.basename(item_path)
                        items.append({'name': item_name, 'path': item_path, 'size_display': size_str})

                df_res = connector.execute_command("df -h / | tail -n 1")
                df_parts = df_res.stdout.split()
                total_space, used_space, free_space, percent = (df_parts[1], df_parts[2], df_parts[3], df_parts[4]) if len(df_parts) >= 5 else ('--', '--', '--', '0%')
            else:
                total_space, used_space, free_space, percent = ('500 GB', '120 GB', '380 GB', '24%')

            return Response({
                'path': safe_path,
                'total_space': total_space,
                'used_space': used_space,
                'free_space': free_space,
                'used_percent': percent,
                'items': items
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
