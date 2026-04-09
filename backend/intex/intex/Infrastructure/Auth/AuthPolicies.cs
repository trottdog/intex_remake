namespace Intex.Infrastructure.Auth;

public static class AuthPolicies
{
    public const string AnyAuthenticatedUser = "AnyAuthenticatedUser";
    public const string DonorOnly = "DonorOnly";
    public const string DonorOrStaffOrAbove = "DonorOrStaffOrAbove";
    public const string StaffOrAbove = "StaffOrAbove";
    public const string AdminOrAbove = "AdminOrAbove";
    public const string SuperAdminOnly = "SuperAdminOnly";
}
