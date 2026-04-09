using System.Text.Json;
using System.Text.Json.Serialization;
using Intex.Infrastructure.Api.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Infrastructure.Api;

public static class ApiContractServiceCollectionExtensions
{
    public static IServiceCollection AddApiContractInfrastructure(this IServiceCollection services)
    {
        services
            .AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
                options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
            });

        services.Configure<Microsoft.AspNetCore.Mvc.JsonOptions>(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
        });

        services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
        });

        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.SuppressModelStateInvalidFilter = true;
            options.SuppressMapClientErrors = true;
            options.InvalidModelStateResponseFactory = context =>
            {
                var errorMessage = context.ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage)
                    .FirstOrDefault(static x => !string.IsNullOrWhiteSpace(x))
                    ?? "Request validation failed";

                return new BadRequestObjectResult(new ErrorResponse(errorMessage));
            };
        });

        return services;
    }
}
