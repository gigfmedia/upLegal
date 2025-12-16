import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Trash2, User, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await adminService.getUsers();
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const { success, error } = await adminService.deleteUser(userToDelete.id);
      
      if (error || !success) {
        throw new Error(error || 'No se pudo eliminar el usuario');
      }
      
      // Refresh the users list
      await fetchUsers();
      
      toast.success(`Usuario ${userToDelete.email} eliminado correctamente`);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Error al eliminar el usuario: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Exclude Gabriela Gómez by email
    if (user.email?.toLowerCase() === 'gabignaciagomez@gmail.com') {
      return false;
    }
    
    return (
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-black-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre'}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                      {user.role || 'user'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setUserToDelete(user)}
                      disabled={user.role === 'admin' || user.id === currentUser?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar usuario?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos del usuario de forma permanente.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">
                  {userToDelete.first_name} {userToDelete.last_name}
                </p>
                <p className="text-sm text-red-700">{userToDelete.email}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar usuario'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
