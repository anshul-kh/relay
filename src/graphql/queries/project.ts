export const GET_PROJECT_QUERY = `
    query getSiteData($slug: String!) {
        site: hosted_projects(where: {_or: [{project_slug: {_eq: $slug}}, {custom_slug: {_eq: $slug}}]}, limit: 1) {
            id
            custom_slug
            is_active
            metadata
            project_slug
            seo_data
        }
    }
`;
