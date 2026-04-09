namespace backend.intex.Infrastructure.Auth;

public static class PolicyNames
{
    public const string DonorOnly = nameof(DonorOnly);
    public const string StaffOrAbove = nameof(StaffOrAbove);
    public const string AdminOrAbove = nameof(AdminOrAbove);
    public const string SuperAdminOnly = nameof(SuperAdminOnly);
    public const string DonorOrStaffOrAbove = nameof(DonorOrStaffOrAbove);
}
