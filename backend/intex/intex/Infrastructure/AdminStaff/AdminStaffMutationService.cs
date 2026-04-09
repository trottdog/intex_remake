using System.Globalization;
using System.Net.Mail;
using Intex.Infrastructure.AdminStaff.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Donor.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Intex.Infrastructure.AdminStaff;

public sealed class AdminStaffMutationService(BeaconDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<ResidentListItemResponse> CreateResidentAsync(
        CreateResidentRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new CreateResidentRequest(null, null, null, null, null, null, null, null, null, null);

        var residentCode = RequireText(request.ResidentCode, "residentCode is required");
        var safehouseId = request.SafehouseId ?? throw new ApiException(StatusCodes.Status400BadRequest, "safehouseId is required");
        var caseCategory = RequireText(request.CaseCategory, "caseCategory is required");
        var admissionDate = RequireValidDate(request.AdmissionDate);

        var resident = new Resident
        {
            ResidentCode = residentCode,
            SafehouseId = safehouseId,
            AssignedWorkerId = request.AssignedWorkerId,
            CaseStatus = string.IsNullOrWhiteSpace(request.CaseStatus) ? "active" : request.CaseStatus,
            CaseCategory = caseCategory,
            RiskLevel = string.IsNullOrWhiteSpace(request.RiskLevel) ? "medium" : request.RiskLevel,
            ReintegrationStatus = string.IsNullOrWhiteSpace(request.ReintegrationStatus) ? "not_started" : request.ReintegrationStatus,
            AdmissionDate = admissionDate,
            DischargeDate = NormalizeOptionalDate(request.DischargeDate),
            AgeGroup = NullIfWhiteSpace(request.AgeGroup),
            LastUpdated = timeProvider.GetUtcNow(),
            CreatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Residents.Add(resident);
        await SaveChangesAsync(cancellationToken);

        return new ResidentListItemResponse
        {
            Id = resident.Id,
            ResidentCode = resident.ResidentCode,
            SafehouseId = resident.SafehouseId,
            IntakeDate = resident.AdmissionDate,
            AdmissionDate = resident.AdmissionDate,
            Status = resident.CaseStatus,
            CaseStatus = resident.CaseStatus,
            RiskLevel = resident.RiskLevel,
            AgeGroup = resident.AgeGroup,
            CaseType = resident.CaseCategory,
            AssignedWorkerId = resident.AssignedWorkerId,
            AssignedStaffId = resident.AssignedWorkerId,
            ExitDate = resident.DischargeDate,
            ReintegrationStatus = resident.ReintegrationStatus,
            DischargeDate = resident.DischargeDate,
            CaseCategory = resident.CaseCategory,
            SafehouseName = string.Empty,
            AssignedStaffName = null,
            AssignedWorkerName = null,
            LastUpdated = resident.LastUpdated,
            CreatedAt = resident.CreatedAt
        };
    }

    public async Task<ResidentListItemResponse> UpdateResidentAsync(
        int residentId,
        UpdateResidentRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new UpdateResidentRequest(null, null, null, null, null, null, null, null, null);

        var resident = await dbContext.Residents
            .SingleOrDefaultAsync(x => x.Id == residentId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        if (request.SafehouseId.HasValue)
        {
            resident.SafehouseId = request.SafehouseId.Value;
        }

        if (request.AssignedWorkerId is not null)
        {
            resident.AssignedWorkerId = request.AssignedWorkerId;
        }

        if (request.CaseStatus is not null)
        {
            resident.CaseStatus = request.CaseStatus;
        }

        if (request.CaseCategory is not null)
        {
            resident.CaseCategory = request.CaseCategory;
        }

        if (request.RiskLevel is not null)
        {
            resident.RiskLevel = request.RiskLevel;
        }

        if (request.ReintegrationStatus is not null)
        {
            resident.ReintegrationStatus = request.ReintegrationStatus;
        }

        if (request.AdmissionDate is not null)
        {
            resident.AdmissionDate = RequireValidDate(request.AdmissionDate);
        }

        if (request.DischargeDate is not null)
        {
            resident.DischargeDate = NormalizeOptionalDate(request.DischargeDate);
        }

        if (request.AgeGroup is not null)
        {
            resident.AgeGroup = NullIfWhiteSpace(request.AgeGroup);
        }

        resident.LastUpdated = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return await dbContext.Residents.AsNoTracking()
            .Where(x => x.Id == residentId)
            .Select(x => new ResidentListItemResponse
            {
                Id = x.Id,
                ResidentCode = x.ResidentCode,
                SafehouseId = x.SafehouseId,
                IntakeDate = x.AdmissionDate,
                AdmissionDate = x.AdmissionDate,
                Status = x.CaseStatus,
                CaseStatus = x.CaseStatus,
                RiskLevel = x.RiskLevel,
                AgeGroup = x.AgeGroup,
                CaseType = x.CaseCategory,
                AssignedWorkerId = x.AssignedWorkerId,
                AssignedStaffId = x.AssignedWorkerId,
                ExitDate = x.DischargeDate,
                ReintegrationStatus = x.ReintegrationStatus,
                DischargeDate = x.DischargeDate,
                CaseCategory = x.CaseCategory,
                SafehouseName = x.Safehouse.Name,
                AssignedStaffName = x.AssignedWorker != null ? $"{x.AssignedWorker.FirstName} {x.AssignedWorker.LastName}" : null,
                AssignedWorkerName = x.AssignedWorker != null ? $"{x.AssignedWorker.FirstName} {x.AssignedWorker.LastName}" : null,
                LastUpdated = x.LastUpdated,
                CreatedAt = x.CreatedAt
            })
            .SingleAsync(cancellationToken);
    }

    public async Task DeleteResidentAsync(int residentId, CancellationToken cancellationToken)
    {
        var resident = await dbContext.Residents
            .SingleOrDefaultAsync(x => x.Id == residentId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        dbContext.Residents.Remove(resident);
        await SaveChangesAsync(cancellationToken);
    }

    public async Task<DonationListItemResponse> CreateDonationAsync(
        CreateDonationRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new CreateDonationRequest(null, null, null, null, null, null, null, null, null, null);

        var supporterId = request.SupporterId ?? throw new ApiException(StatusCodes.Status400BadRequest, "supporterId is required");
        var donationType = RequireText(request.DonationType, "donationType is required");
        var donationDate = RequireValidDate(request.DonationDate);

        if (request.Amount is <= 0)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Amount must be positive");
        }

        var donation = new Donation
        {
            SupporterId = supporterId,
            DonationType = donationType,
            Amount = request.Amount,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency,
            Campaign = NullIfWhiteSpace(request.Campaign),
            SafehouseId = request.SafehouseId,
            DonationDate = donationDate,
            ReceiptUrl = NullIfWhiteSpace(request.ReceiptUrl),
            Notes = NullIfWhiteSpace(request.Notes),
            IsAnonymous = request.IsAnonymous ?? false,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Donations.Add(donation);
        await SaveChangesAsync(cancellationToken);

        return await MapDonationAsync(donation.Id, cancellationToken);
    }

    public async Task<DonationListItemResponse> UpdateDonationAsync(
        int donationId,
        UpdateDonationRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new UpdateDonationRequest(null, null, null, null, null, null, null, null, null);

        var donation = await dbContext.Donations
            .SingleOrDefaultAsync(x => x.Id == donationId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        if (request.DonationType is not null)
        {
            donation.DonationType = request.DonationType;
        }

        if (request.Amount.HasValue)
        {
            if (request.Amount <= 0)
            {
                throw new ApiException(StatusCodes.Status400BadRequest, "Amount must be positive");
            }

            donation.Amount = request.Amount;
        }

        if (request.Currency is not null)
        {
            donation.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "USD" : request.Currency;
        }

        if (request.Campaign is not null)
        {
            donation.Campaign = NullIfWhiteSpace(request.Campaign);
        }

        if (request.SafehouseId is not null)
        {
            donation.SafehouseId = request.SafehouseId;
        }

        if (request.DonationDate is not null)
        {
            donation.DonationDate = RequireValidDate(request.DonationDate);
        }

        if (request.ReceiptUrl is not null)
        {
            donation.ReceiptUrl = NullIfWhiteSpace(request.ReceiptUrl);
        }

        if (request.Notes is not null)
        {
            donation.Notes = NullIfWhiteSpace(request.Notes);
        }

        if (request.IsAnonymous.HasValue)
        {
            donation.IsAnonymous = request.IsAnonymous.Value;
        }

        donation.UpdatedAt = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return await MapDonationAsync(donation.Id, cancellationToken);
    }

    public async Task DeleteDonationAsync(int donationId, CancellationToken cancellationToken)
    {
        var donation = await dbContext.Donations
            .SingleOrDefaultAsync(x => x.Id == donationId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        dbContext.Donations.Remove(donation);
        await SaveChangesAsync(cancellationToken);
    }

    public async Task<SupporterMeResponse> CreateSupporterAsync(
        CreateSupporterRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new CreateSupporterRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        var email = RequireValidEmail(request.Email);

        var supporter = new Supporter
        {
            FirstName = RequireText(request.FirstName, "firstName is required"),
            LastName = RequireText(request.LastName, "lastName is required"),
            Email = email,
            Phone = NullIfWhiteSpace(request.Phone),
            Organization = NullIfWhiteSpace(request.Organization),
            SupportType = string.IsNullOrWhiteSpace(request.SupportType) ? "individual" : request.SupportType,
            AcquisitionChannel = NullIfWhiteSpace(request.AcquisitionChannel),
            Segment = NullIfWhiteSpace(request.Segment),
            ChurnRiskScore = request.ChurnRiskScore,
            UpgradeScore = request.UpgradeScore,
            LifetimeGiving = request.LifetimeGiving ?? 0m,
            LastGiftDate = NormalizeOptionalDate(request.LastGiftDate),
            LastGiftAmount = request.LastGiftAmount,
            IsRecurring = request.IsRecurring ?? false,
            CommunicationPreference = NullIfWhiteSpace(request.CommunicationPreference),
            Interests = request.Interests ?? [],
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };

        dbContext.Supporters.Add(supporter);
        await SaveChangesAsync(cancellationToken);

        return MapSupporter(supporter);
    }

    public async Task<SupporterMeResponse> UpdateSupporterAsync(
        int supporterId,
        UpdateSupporterRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new UpdateSupporterRequest(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

        var supporter = await dbContext.Supporters
            .SingleOrDefaultAsync(x => x.Id == supporterId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        if (request.FirstName is not null)
        {
            supporter.FirstName = request.FirstName;
        }

        if (request.LastName is not null)
        {
            supporter.LastName = request.LastName;
        }

        if (request.Email is not null)
        {
            supporter.Email = RequireValidEmail(request.Email);
        }

        if (request.Phone is not null)
        {
            supporter.Phone = NullIfWhiteSpace(request.Phone);
        }

        if (request.Organization is not null)
        {
            supporter.Organization = NullIfWhiteSpace(request.Organization);
        }

        if (request.SupportType is not null)
        {
            supporter.SupportType = request.SupportType;
        }

        if (request.AcquisitionChannel is not null)
        {
            supporter.AcquisitionChannel = NullIfWhiteSpace(request.AcquisitionChannel);
        }

        if (request.Segment is not null)
        {
            supporter.Segment = NullIfWhiteSpace(request.Segment);
        }

        if (request.ChurnRiskScore.HasValue)
        {
            supporter.ChurnRiskScore = request.ChurnRiskScore;
        }

        if (request.UpgradeScore.HasValue)
        {
            supporter.UpgradeScore = request.UpgradeScore;
        }

        if (request.LifetimeGiving.HasValue)
        {
            supporter.LifetimeGiving = request.LifetimeGiving.Value;
        }

        if (request.LastGiftDate is not null)
        {
            supporter.LastGiftDate = NormalizeOptionalDate(request.LastGiftDate);
        }

        if (request.LastGiftAmount.HasValue)
        {
            supporter.LastGiftAmount = request.LastGiftAmount;
        }

        if (request.IsRecurring.HasValue)
        {
            supporter.IsRecurring = request.IsRecurring.Value;
        }

        if (request.CommunicationPreference is not null)
        {
            supporter.CommunicationPreference = NullIfWhiteSpace(request.CommunicationPreference);
        }

        if (request.Interests is not null)
        {
            supporter.Interests = request.Interests;
        }

        supporter.UpdatedAt = timeProvider.GetUtcNow();
        await SaveChangesAsync(cancellationToken);

        return MapSupporter(supporter);
    }

    public async Task DeleteSupporterAsync(int supporterId, CancellationToken cancellationToken)
    {
        var supporter = await dbContext.Supporters
            .SingleOrDefaultAsync(x => x.Id == supporterId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "Not found");

        dbContext.Supporters.Remove(supporter);
        await SaveChangesAsync(cancellationToken);
    }

    public async Task<DonationAllocationResponse> CreateDonationAllocationAsync(
        CreateDonationAllocationRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new CreateDonationAllocationRequest(null, null, null, null, null);

        var allocation = new DonationAllocation
        {
            DonationId = request.DonationId ?? throw new ApiException(StatusCodes.Status400BadRequest, "donationId is required"),
            SafehouseId = request.SafehouseId ?? throw new ApiException(StatusCodes.Status400BadRequest, "safehouseId is required"),
            ProgramArea = RequireText(request.ProgramArea, "programArea is required"),
            Amount = request.Amount ?? throw new ApiException(StatusCodes.Status400BadRequest, "amount is required"),
            Percentage = request.Percentage ?? throw new ApiException(StatusCodes.Status400BadRequest, "percentage is required"),
            CreatedAt = timeProvider.GetUtcNow()
        };

        dbContext.DonationAllocations.Add(allocation);
        await SaveChangesAsync(cancellationToken);

        return new DonationAllocationResponse
        {
            Id = allocation.Id,
            DonationId = allocation.DonationId,
            SafehouseId = allocation.SafehouseId,
            ProgramArea = allocation.ProgramArea,
            Amount = allocation.Amount,
            Percentage = allocation.Percentage,
            SafehouseName = string.Empty,
            CreatedAt = allocation.CreatedAt
        };
    }

    private async Task<DonationListItemResponse> MapDonationAsync(int donationId, CancellationToken cancellationToken)
    {
        return await dbContext.Donations.AsNoTracking()
            .Where(x => x.Id == donationId)
            .Select(x => new DonationListItemResponse
            {
                Id = x.Id,
                SupporterId = x.SupporterId,
                Amount = x.Amount,
                Currency = x.Currency,
                DonationDate = x.DonationDate,
                Category = null,
                DonationType = x.DonationType,
                Campaign = x.Campaign,
                Status = "completed",
                SafehouseName = x.Safehouse != null ? x.Safehouse.Name : null,
                SafehouseId = x.SafehouseId,
                ReceiptUrl = x.ReceiptUrl,
                Notes = x.Notes,
                IsAnonymous = x.IsAnonymous,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .SingleAsync(cancellationToken);
    }

    private static SupporterMeResponse MapSupporter(Supporter supporter)
    {
        return new SupporterMeResponse
        {
            Id = supporter.Id,
            FirstName = supporter.FirstName,
            LastName = supporter.LastName,
            Email = supporter.Email,
            Phone = supporter.Phone,
            Organization = supporter.Organization,
            SupportType = supporter.SupportType,
            AcquisitionChannel = supporter.AcquisitionChannel,
            Segment = supporter.Segment,
            ChurnRiskScore = supporter.ChurnRiskScore,
            UpgradeScore = supporter.UpgradeScore,
            LifetimeGiving = supporter.LifetimeGiving,
            LastGiftDate = supporter.LastGiftDate,
            LastGiftAmount = supporter.LastGiftAmount,
            IsRecurring = supporter.IsRecurring,
            CommunicationPreference = supporter.CommunicationPreference,
            Interests = supporter.Interests,
            CreatedAt = supporter.CreatedAt,
            UpdatedAt = supporter.UpdatedAt
        };
    }

    private async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException postgresException)
        {
            throw postgresException.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation => new ApiException(StatusCodes.Status409Conflict, "A record with that value already exists"),
                PostgresErrorCodes.ForeignKeyViolation => new ApiException(StatusCodes.Status400BadRequest, "Invalid reference provided"),
                PostgresErrorCodes.NotNullViolation => new ApiException(StatusCodes.Status400BadRequest, "Request failed"),
                PostgresErrorCodes.CheckViolation => new ApiException(StatusCodes.Status400BadRequest, "Request failed"),
                _ => exception
            };
        }
    }

    private static string RequireValidEmail(string? value)
    {
        var email = RequireText(value, "email is required");

        try
        {
            _ = new MailAddress(email);
            return email;
        }
        catch (FormatException)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid email format");
        }
    }

    private static string RequireValidDate(string? value)
    {
        var input = RequireText(value, "Invalid date format — use YYYY-MM-DD");
        if (!DateOnly.TryParseExact(input, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid date format — use YYYY-MM-DD");
        }

        return input;
    }

    private static string? NormalizeOptionalDate(string? value)
    {
        if (value is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return RequireValidDate(value);
    }

    private static string RequireText(string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, message);
        }

        return value.Trim();
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
