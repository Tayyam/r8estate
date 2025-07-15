import React from 'react';
import { User as UserType } from '../../../types/user';
import UserTableRow from './UserTableRow';

interface UserTableProps {
  filteredUsers: UserType[];
  currentUserId: string | undefined;
  translations: any;
  openChangePasswordModal: (user: UserType) => void;
  openDeleteModal: (user: UserType) => void;
  actionLoading: string | null;
  suspendLoading: string | null;
  handleToggleUserStatus: (user: UserType) => Promise<void>;
  loading: boolean;
}

const UserTable: React.FC<UserTableProps> = ({
  filteredUsers,
  currentUserId,
  translations,
  openChangePasswordModal,
  openDeleteModal,
  actionLoading,
  suspendLoading,
  handleToggleUserStatus,
  loading
}) => {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl shadow-md">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {translations?.noUsersFound || 'No Users Found'}
        </h3>
        <p className="text-gray-600 mb-6">
          {translations?.adjustSearchCriteriaUsers || 'Try adjusting your search criteria'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.user || 'User'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.role || 'Role'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.verification || 'Verification'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.status || 'Status'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.createdDate || 'Created'}
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.actions || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredUsers.map((user) => (
            <UserTableRow
              key={user.uid}
              user={user}
              currentUserId={currentUserId}
              translations={translations}
              openChangePasswordModal={openChangePasswordModal}
              openDeleteModal={openDeleteModal}
              actionLoading={actionLoading}
              suspendLoading={suspendLoading}
              handleToggleUserStatus={handleToggleUserStatus}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;