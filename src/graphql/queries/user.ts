export const GET_USER_CONFIG = `
    query getUserConfig($uid: uuid!) {
        user: users_by_pk(id: $uid) {
            is_active
            username
            hosted_projects_aggregate {
                aggregate {
                    count
                }
            }
        }
    }
`;
