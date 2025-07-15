import React from 'react';
import { User, Mail, Key, CheckCircle, XCircle, Trash2, Shield, Building2 } from 'lucide-react';
import { User as UserType } from '../../../types/user';

interface UserTableRowProps {
  user: UserType;
  currentUserId: string | undefined;
  translations: any;
  openChangePasswordModal: (user: UserType) => void;
  openDeleteModal: (user: UserType) => void;
  actionLoading: string | null;
  suspendLoading: string | null;
  handleToggleUserStatus: (user: UserType) => Promise<void>;
}

const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  currentUserId,
  translations,
  openChangePasswordModal,
  openDeleteModal,
  actionLoading,
  suspendLoading,
  handleToggleUserStatus
}) => {
  // Get role badge color
  const getRoleBadgeColor = (role: string, companyName?: string) => {
    switch(role) {
      case 'admin':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' };
      case 'company':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563eb' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#4b5563' };
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string = 'active') => {
    switch(status) {
      case 'suspended':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' };
    }
  };

  // Format role name with company name if available
  const getRoleDisplay = () => {
    if (user.role === 'company') {
      if (user.companyName) {
        return (
          <div>
            <span className="font-medium">
              {translations?.company || 'Company'}
            </span>
            <div className="flex items-center mt-1 text-xs text-blue-600">
              <Building2 className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
              <span className="truncate max-w-[150px]">{user.companyName}</span>
            </div>
            {user.isSupervisor && (
              <div className="mt-1 bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full inline-block">
                {translations?.supervisor || 'Supervisor'}
              </div>
            )}
            {!user.isSupervisor && user.role === 'company' && (
              <div className="mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full inline-block">
                {translations?.business || 'Business'}
              </div>
            )}
          </div>
        );
      }
      
      return (
        <div>
          <span>{translations?.company || 'Company'}</span>
          {user.isSupervisor && (
            <div className="mt-1 bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full inline-block">
              {translations?.supervisor || 'Supervisor'}
            </div>
          )}
          {!user.isSupervisor && user.role === 'company' && (
            <div className="mt-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full inline-block">
              {translations?.business || 'Business'}
            </div>
          )}
        </div>
      );
    }
    
    return user.role === 'admin' ? (translations?.admin || 'Admin') : (translations?.userRole || 'User');
  };
  
  const roleBadge = getRoleBadgeColor(user.role, user.companyName);
  
  return (
    <tr className="hover:bg-gray-50">
      {/* User */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-200">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
            <div className="text-xs text-gray-500 flex items-center">
              <Mail className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
              {user.email}
            </div>
          </div>
        </div>
      </td>
      
      {/* Role */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div 
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: roleBadge.bg,
              color: roleBadge.text
            }}
          >
            {user.role === 'admin' ? (
              <Shield className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
            ) : user.role === 'company' ? (
              <Building2 className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
            ) : (
              <User className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
            )}
            {getRoleDisplay()}
          </div>
        </div>
      </td>
      
      {/* Verification */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`inline-flex items-center ${
          user.isEmailVerified 
            ? 'text-green-600' 
            : 'text-yellow-600'
        }`}>
          {user.isEmailVerified
            ? <CheckCircle className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" /> 
            : <XCircle className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
          }
          <span>
            {user.isEmailVerified
              ? (translations?.verified || 'Verified')
              : (translations?.notVerified || 'Not Verified')
            }
          </span>
        </div>
      </td>
      
      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div 
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: getStatusBadgeColor(user.status).bg,
            color: getStatusBadgeColor(user.status).text
          }}
        >
          {user.status === 'suspended'
            ? <XCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" /> 
            : <CheckCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
          }
          <span>
            {user.status === 'suspended'
              ? (translations?.suspended || 'Suspended')
              : (translations?.active || 'Active')
            }
          </span>
        </div>
      </td>
      
      {/* Created Date */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10).split('-').reverse().join('/')}
      </td>
      
      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          {user.uid !== currentUserId && (
            <>
              {/* Suspend/Reactivate Button */}
              <button
                onClick={() => handleToggleUserStatus(user)}
                disabled={actionLoading !== null || suspendLoading === user.uid}
                className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors duration-150 disabled:opacity-50 ${
                  user.status === 'suspended'
                    ? 'text-green-700 bg-green-100 hover:bg-green-200'
                    : 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200'
                }`}
                title={user.status === 'suspended'
                  ? (translations?.reactivateUser || 'Reactivate User')
                  : (translations?.suspendUser || 'Suspend User')
                }
              >
                {suspendLoading === user.uid ? (
                  <div className="w-3 h-3 mr-1 rtl:ml-1 rtl:mr-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <XCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                )}
                {user.status === 'suspended'
                  ? (translations?.reactivate || 'Reactivate')
                  : (translations?.suspend || 'Suspend')
                }
              </button>

              {/* Change Password Button */}
              <button
                onClick={() => openChangePasswordModal(user)}
                disabled={actionLoading !== null}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-150 disabled:opacity-50"
                title={translations?.changePassword || 'Change Password'}
              >
                <Key className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                {translations?.passwordAction || 'Password'}
              </button>

              {/* Delete Button */}
              <button
                onClick={() => openDeleteModal(user)}
                disabled={actionLoading !== null}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-150 disabled:opacity-50"
                title={translations?.deleteUser || 'Delete User'}
              >
                <Trash2 className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                {translations?.deleteAction || 'Delete'}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default UserTableRow;